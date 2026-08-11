-- ============================================================
-- 1. Soft Delete: Add is_deleted to all relevant tables
-- ============================================================
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'app_users','access_levels','drivers','mechanics','vehicles',
    'inspection_plans','inspection_plan_items','maintenance_plans',
    'maintenance_plan_tasks','maintenance_plan_materials','maintenance_plan_labor',
    'maintenance_plan_triggers','products','suppliers','stock_locations',
    'stock_batches','service_catalog','work_orders','inspections',
    'inspection_results','non_conformities','os_diagnosis','os_external',
    'os_labor','os_materials','os_services','schedule_records','vehicle_systems',
    'product_classifications','product_equivalents','product_units',
    'product_applications','stock_movements'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false', tbl);
  END LOOP;
END $$;

-- ============================================================
-- 2. Vehicle enhancements: crlv_url
-- ============================================================
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS crlv_url TEXT;

-- ============================================================
-- 3. Supplier enhancements: city, address
-- ============================================================
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS address TEXT;

-- ============================================================
-- 4. People table (unified mechanic/driver)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  full_name TEXT,
  cpf TEXT,
  city TEXT,
  role TEXT,
  phone TEXT,
  whatsapp TEXT,
  cnh_type TEXT,
  cnh_attachment TEXT,
  hourly_cost NUMERIC(12,2) DEFAULT 0,
  participation TEXT,
  is_active BOOLEAN DEFAULT true,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. Product suppliers junction table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.product_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_code TEXT,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. Stock inventory table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.stock_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.stock_locations(id) ON DELETE SET NULL,
  counted_quantity NUMERIC(12,2) DEFAULT 0,
  system_quantity NUMERIC(12,2) DEFAULT 0,
  divergence NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'Pendente',
  counted_by TEXT,
  counted_at TIMESTAMPTZ,
  notes TEXT,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. Storage buckets
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('vehicle-documents', 'vehicle-documents', true),
  ('people-documents', 'people-documents', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 8. Storage policies
-- ============================================================
DO $$
DECLARE
  bucket_name TEXT;
  buckets TEXT[] := ARRAY['vehicle-documents', 'people-documents'];
BEGIN
  FOREACH bucket_name IN ARRAY buckets LOOP
    EXECUTE format('DROP POLICY IF EXISTS "auth_read_%s" ON storage.objects', bucket_name);
    EXECUTE format('CREATE POLICY "auth_read_%s" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = ''%s'')', bucket_name, bucket_name);
    EXECUTE format('DROP POLICY IF EXISTS "auth_insert_%s" ON storage.objects', bucket_name);
    EXECUTE format('CREATE POLICY "auth_insert_%s" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = ''%s'')', bucket_name, bucket_name);
    EXECUTE format('DROP POLICY IF EXISTS "auth_update_%s" ON storage.objects', bucket_name);
    EXECUTE format('CREATE POLICY "auth_update_%s" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = ''%s'')', bucket_name, bucket_name);
    EXECUTE format('DROP POLICY IF EXISTS "auth_delete_%s" ON storage.objects', bucket_name);
    EXECUTE format('CREATE POLICY "auth_delete_%s" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = ''%s'')', bucket_name, bucket_name);
  END LOOP;
END $$;

-- ============================================================
-- 9. RLS for new tables
-- ============================================================
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_inventory ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
  new_tables TEXT[] := ARRAY['people', 'product_suppliers', 'stock_inventory'];
BEGIN
  FOREACH tbl IN ARRAY new_tables LOOP
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

-- ============================================================
-- 10. Migrate existing mechanic/driver data to people
-- ============================================================
INSERT INTO public.people (name, full_name, cpf, role, phone, whatsapp, hourly_cost, is_active)
SELECT name, name, cpf, 'Mecânico', phone, whatsapp, COALESCE(hourly_rate, 0),
  CASE WHEN status = 'Ativo' THEN true ELSE false END
FROM public.mechanics
ON CONFLICT DO NOTHING;

INSERT INTO public.people (name, full_name, cpf, role, phone, whatsapp)
SELECT name, name, cpf, 'Motorista', phone, whatsapp
FROM public.drivers
WHERE cpf IS NULL OR cpf NOT IN (SELECT cpf FROM public.people WHERE cpf IS NOT NULL)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 11. Update admin permissions
-- ============================================================
UPDATE public.access_levels
SET permissions = '{"screens": ["dashboard","vehicles","components","maintenance_plans","inspection_plans","entries","scheduling","stock","products","people","suppliers","service_catalog","history","indicators","dash_maintenance","access_levels","users"]}'::jsonb
WHERE name = 'Administrador';

-- ============================================================
-- 12. Update current_stock view to filter deleted records
-- ============================================================
CREATE OR REPLACE VIEW public.current_stock
WITH (security_invoker = true) AS
SELECT
  p.id, p.name, p.code, p.category, p.unit, p.min_quantity, p.unit_value, p.supplier,
  COALESCE(SUM(CASE WHEN sm.movement_type IN ('entrada', 'retorno') THEN sm.quantity ELSE -sm.quantity END), 0) AS current_balance
FROM public.products p
LEFT JOIN public.stock_movements sm ON sm.product_id = p.id AND COALESCE(sm.is_deleted, false) = false
WHERE COALESCE(p.is_deleted, false) = false
GROUP BY p.id, p.name, p.code, p.category, p.unit, p.min_quantity, p.unit_value, p.supplier;
