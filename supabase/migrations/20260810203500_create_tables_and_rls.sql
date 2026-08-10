CREATE TABLE IF NOT EXISTS public.access_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.app_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  access_level_id UUID REFERENCES public.access_levels(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate TEXT NOT NULL,
  cost_center TEXT,
  brand TEXT,
  model TEXT,
  axles_count INTEGER DEFAULT 2,
  vehicle_type TEXT NOT NULL,
  year INTEGER,
  purchase_cost NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.maintenance_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Preventiva',
  periodicity TEXT,
  target_vehicle_type TEXT,
  target_plate TEXT,
  responsible TEXT,
  status TEXT NOT NULL DEFAULT 'Ativo',
  next_execution DATE,
  checklist JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inspection_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  periodicity TEXT NOT NULL DEFAULT 'Diária',
  responsible TEXT NOT NULL DEFAULT 'Motorista',
  last_inspection DATE,
  next_inspection DATE,
  checklist JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'Em Dia',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  plate TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Preventiva',
  diagnosis TEXT,
  parts_cost NUMERIC(12,2) DEFAULT 0,
  hours NUMERIC(8,2) DEFAULT 0,
  external_cost NUMERIC(12,2) DEFAULT 0,
  mechanic TEXT,
  status TEXT NOT NULL DEFAULT 'Aberta',
  total_cost NUMERIC(12,2) DEFAULT 0,
  parts JSONB DEFAULT '[]'::jsonb,
  scheduled_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  plate TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Diária',
  driver_name TEXT,
  status TEXT NOT NULL DEFAULT 'OK',
  failed_items JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Peça',
  unit TEXT NOT NULL DEFAULT 'Un',
  min_quantity NUMERIC(12,2) DEFAULT 0,
  unit_value NUMERIC(12,2) DEFAULT 0,
  supplier TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL DEFAULT 'entrada',
  quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit_value NUMERIC(12,2) DEFAULT 0,
  reason TEXT,
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mechanics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cpf TEXT,
  phone TEXT,
  whatsapp TEXT,
  specialty TEXT,
  hourly_rate NUMERIC(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cpf TEXT,
  birth_date DATE,
  phone TEXT,
  whatsapp TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE VIEW public.current_stock
WITH (security_invoker = true) AS
SELECT
  p.id, p.name, p.code, p.category, p.unit, p.min_quantity, p.unit_value, p.supplier,
  COALESCE(SUM(CASE WHEN sm.movement_type IN ('entrada', 'retorno') THEN sm.quantity ELSE -sm.quantity END), 0) AS current_balance
FROM public.products p
LEFT JOIN public.stock_movements sm ON sm.product_id = p.id
GROUP BY p.id, p.name, p.code, p.category, p.unit, p.min_quantity, p.unit_value, p.supplier;

ALTER TABLE public.access_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mechanics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY['access_levels','app_users','vehicles','maintenance_plans','inspection_plans','work_orders','inspections','products','stock_movements','mechanics','drivers'];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "auth_select_%s" ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY "auth_select_%s" ON public.%I FOR SELECT TO authenticated USING (true)', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "auth_insert_%s" ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY "auth_insert_%s" ON public.%I FOR INSERT TO authenticated WITH CHECK (true)', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "auth_update_%s" ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY "auth_update_%s" ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "auth_delete_%s" ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY "auth_delete_%s" ON public.%I FOR DELETE TO authenticated USING (true)', tbl, tbl);
  END LOOP;
END $$;

GRANT SELECT ON public.current_stock TO authenticated;
