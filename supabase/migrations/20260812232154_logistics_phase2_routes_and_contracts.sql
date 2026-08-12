-- ============================================================
-- Logistics Phase 2: Routes & Carrier Contracts
-- Idempotent migration for freight pricing and third-party contracts
-- ============================================================

-- 1. Create new enum: logistics_transport_type
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'logistics_transport_type') THEN
    CREATE TYPE logistics_transport_type AS ENUM ('own_fleet', 'third_party');
  END IF;
END $$;

-- 2. Create routes table (reuses logistics_default_unit for price_unit)
CREATE TABLE IF NOT EXISTS public.routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  destination_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  km_one_way NUMERIC(8,1),
  km_round_trip NUMERIC(8,1),
  km_range TEXT,
  unit_price NUMERIC(10,2) DEFAULT 0,
  price_unit logistics_default_unit DEFAULT 'TON',
  toll_light NUMERIC(8,2) DEFAULT 0,
  toll_heavy NUMERIC(8,2) DEFAULT 0,
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
  agreed_value NUMERIC(10,2) DEFAULT 0,
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
DROP POLICY IF EXISTS "auth_select_routes" ON public.routes;
CREATE POLICY "auth_select_routes" ON public.routes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_routes" ON public.routes;
CREATE POLICY "auth_insert_routes" ON public.routes
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_routes" ON public.routes;
CREATE POLICY "auth_update_routes" ON public.routes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_routes" ON public.routes;
CREATE POLICY "auth_delete_routes" ON public.routes
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_select_carrier_contracts" ON public.carrier_contracts;
CREATE POLICY "auth_select_carrier_contracts" ON public.carrier_contracts
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_carrier_contracts" ON public.carrier_contracts;
CREATE POLICY "auth_insert_carrier_contracts" ON public.carrier_contracts
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_carrier_contracts" ON public.carrier_contracts;
CREATE POLICY "auth_update_carrier_contracts" ON public.carrier_contracts
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_carrier_contracts" ON public.carrier_contracts;
CREATE POLICY "auth_delete_carrier_contracts" ON public.carrier_contracts
  FOR DELETE TO authenticated USING (true);
