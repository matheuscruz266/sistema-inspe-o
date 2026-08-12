-- ============================================================
-- Logistics Phase 2: Routes & Carrier Contracts
-- Idempotent migration for freight pricing and third-party contracts
-- ============================================================

-- 1. Create transport_type enum (reuses logistics_default_unit for price_unit)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'logistics_transport_type') THEN
    CREATE TYPE logistics_transport_type AS ENUM ('own_fleet', 'third_party');
  END IF;
END $$;

-- 2. Create routes table
CREATE TABLE IF NOT EXISTS public.routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  destination_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  km_one_way NUMERIC(8,1),
  km_round_trip NUMERIC(8,1),
  km_range VARCHAR(20),
  unit_price NUMERIC(10,2),
  price_unit logistics_default_unit DEFAULT 'TON',
  toll_light NUMERIC(8,2),
  toll_heavy NUMERIC(8,2),
  valid_from DATE NOT NULL,
  valid_to DATE,
  transport_type logistics_transport_type DEFAULT 'own_fleet',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false
);

-- 3. Create carrier_contracts table
CREATE TABLE IF NOT EXISTS public.carrier_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL,
  agreed_value NUMERIC(10,2),
  value_per_km NUMERIC(10,2),
  valid_from DATE NOT NULL,
  valid_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false
);

-- 4. Enable RLS on new tables
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carrier_contracts ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies (idempotent)
DO $$
DECLARE
  tbl TEXT;
  new_tables TEXT[] := ARRAY['routes', 'carrier_contracts'];
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
