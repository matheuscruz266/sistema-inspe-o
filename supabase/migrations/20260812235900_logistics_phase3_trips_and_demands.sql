-- ============================================================
-- Logistics Phase 3: Trip Demands & Trips
-- Idempotent migration for operational transport cycle
-- ============================================================

-- 1. Create logistics_trip_status enum (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'logistics_trip_status') THEN
    CREATE TYPE logistics_trip_status AS ENUM (
      'requested',
      'scheduled',
      'in_transit',
      'completed',
      'cancelled'
    );
  END IF;
END $$;

-- 2. Create trip_demands table
CREATE TABLE IF NOT EXISTS public.trip_demands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  request_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  requested_date DATE,
  requested_loads SMALLINT,
  requested_tons NUMERIC(10,2),
  requested_m3 NUMERIC(10,2),
  source_channel VARCHAR(30),
  notes VARCHAR(255),
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create trips table
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id UUID REFERENCES public.trip_demands(id) ON DELETE SET NULL,
  trip_date DATE NOT NULL DEFAULT CURRENT_DATE,
  tractor_vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  trailer_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
  origin_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  destination_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  real_volume_m3 NUMERIC(6,1),
  sale_volume_m3 NUMERIC(6,1),
  gross_weight NUMERIC(8,3),
  tare_weight NUMERIC(8,3),
  net_weight NUMERIC(8,3),
  nfe_number VARCHAR(20),
  status logistics_trip_status NOT NULL DEFAULT 'requested',
  start_time TIMESTAMPTZ,
  arrival_time TIMESTAMPTZ,
  finish_time TIMESTAMPTZ,
  calculated_freight_value NUMERIC(10,2),
  notes VARCHAR(255),
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Enable RLS on new tables
ALTER TABLE public.trip_demands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies (idempotent)
DO $$
DECLARE
  tbl TEXT;
  new_tables TEXT[] := ARRAY['trip_demands', 'trips'];
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
