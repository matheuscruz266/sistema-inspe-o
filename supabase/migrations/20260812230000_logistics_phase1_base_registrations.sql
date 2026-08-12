-- ============================================================
-- Logistics Phase 1: Base Registrations
-- Idempotent migration for clients, locations, supplier extensions,
-- driver profiles, asset owners, vehicle sets, trailer cargo profiles
-- ============================================================

-- 1. Create enum types (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'logistics_default_unit') THEN
    CREATE TYPE logistics_default_unit AS ENUM ('TON', 'M3');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'logistics_location_type') THEN
    CREATE TYPE logistics_location_type AS ENUM ('farm', 'yard', 'client_unit', 'other');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'logistics_supplier_type') THEN
    CREATE TYPE logistics_supplier_type AS ENUM ('parts', 'raw_material', 'third_party_freight', 'services');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'logistics_driver_company') THEN
    CREATE TYPE logistics_driver_company AS ENUM ('own_fleet', 'third_party');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'logistics_driver_status') THEN
    CREATE TYPE logistics_driver_status AS ENUM ('active', 'inactive');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'logistics_owner_type') THEN
    CREATE TYPE logistics_owner_type AS ENUM ('julitago', 'affiliated_company', 'third_party');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'logistics_set_status') THEN
    CREATE TYPE logistics_set_status AS ENUM ('active', 'inactive');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'logistics_cargo_type') THEN
    CREATE TYPE logistics_cargo_type AS ENUM ('cavaco', 'toras', 'prancha');
  END IF;
END $$;

-- 2. Create new tables
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_name TEXT NOT NULL,
  group_name TEXT,
  cnpj TEXT,
  city TEXT,
  state TEXT,
  default_unit logistics_default_unit DEFAULT 'TON',
  conversion_factor NUMERIC(10,4),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type logistics_location_type DEFAULT 'other',
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  stock_location_id UUID REFERENCES public.stock_locations(id) ON DELETE SET NULL,
  city TEXT,
  state TEXT,
  latitude NUMERIC(10,6),
  longitude NUMERIC(10,6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.supplier_payment_info (
  supplier_id UUID PRIMARY KEY REFERENCES public.suppliers(id) ON DELETE CASCADE,
  bank TEXT,
  agency TEXT,
  account TEXT,
  pix_key TEXT,
  estimated_monthly_volume_tons NUMERIC(10,2) DEFAULT 0,
  default_price_per_ton NUMERIC(10,2) DEFAULT 0,
  linked_yard_location_id UUID REFERENCES public.stock_locations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.driver_profiles (
  person_id UUID PRIMARY KEY REFERENCES public.people(id) ON DELETE CASCADE,
  home_city TEXT,
  company logistics_driver_company,
  participation_percentage NUMERIC(5,2) DEFAULT 0,
  status logistics_driver_status DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.asset_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_type logistics_owner_type DEFAULT 'julitago',
  cnpj_cpf TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.vehicle_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_code TEXT,
  status logistics_set_status DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.vehicle_set_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_set_id UUID NOT NULL REFERENCES public.vehicle_sets(id) ON DELETE CASCADE,
  tractor_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  trailer_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
  valid_from DATE NOT NULL,
  valid_to DATE,
  change_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.trailer_cargo_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trailer_vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  cargo_type logistics_cargo_type,
  real_volume_m3 NUMERIC(6,1),
  sale_volume_m3 NUMERIC(6,1),
  max_payload_kg NUMERIC(8,1),
  valid_from DATE NOT NULL,
  valid_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false
);

-- 3. Extend existing tables
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS supplier_type logistics_supplier_type;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.asset_owners(id) ON DELETE SET NULL;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Ativo';

-- 4. Enable RLS on new tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payment_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_set_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trailer_cargo_profiles ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies (idempotent)
DO $$
DECLARE
  tbl TEXT;
  new_tables TEXT[] := ARRAY['clients', 'locations', 'supplier_payment_info', 'driver_profiles', 'asset_owners', 'vehicle_sets', 'vehicle_set_assignments', 'trailer_cargo_profiles'];
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
