-- ============================================================
-- Phase 5: Fuel Records Table
-- Idempotent migration for fuel refueling operations
-- ============================================================

CREATE TABLE IF NOT EXISTS public.fuel_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  driver_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
  refuel_date DATE NOT NULL DEFAULT CURRENT_DATE,
  refuel_time TIMESTAMPTZ,
  quantity NUMERIC(10,3) NOT NULL DEFAULT 0,
  unit_value NUMERIC(10,3) NOT NULL DEFAULT 0,
  total_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  odometer NUMERIC(12,1),
  horimeter NUMERIC(12,1),
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.stock_locations(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.fuel_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies (idempotent)
DROP POLICY IF EXISTS "auth_select_fuel_records" ON public.fuel_records;
CREATE POLICY "auth_select_fuel_records" ON public.fuel_records
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_fuel_records" ON public.fuel_records;
CREATE POLICY "auth_insert_fuel_records" ON public.fuel_records
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_fuel_records" ON public.fuel_records;
CREATE POLICY "auth_update_fuel_records" ON public.fuel_records
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_fuel_records" ON public.fuel_records;
CREATE POLICY "auth_delete_fuel_records" ON public.fuel_records
  FOR DELETE TO authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fuel_records_vehicle_id ON public.fuel_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_records_refuel_date ON public.fuel_records(refuel_date);
CREATE INDEX IF NOT EXISTS idx_fuel_records_supplier_id ON public.fuel_records(supplier_id);
