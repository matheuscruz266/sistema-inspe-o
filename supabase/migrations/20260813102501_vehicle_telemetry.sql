-- ============================================================
-- Phase 5: Vehicle Telemetry Table
-- Idempotent migration for vehicle telemetry monitoring
-- ============================================================

CREATE TABLE IF NOT EXISTS public.vehicle_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  odometer NUMERIC(12,1),
  horimeter NUMERIC(12,1),
  speed NUMERIC(6,1),
  fuel_level NUMERIC(6,2),
  battery_voltage NUMERIC(6,2),
  engine_temperature NUMERIC(6,1),
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.vehicle_telemetry ENABLE ROW LEVEL SECURITY;

-- RLS Policies (idempotent)
DROP POLICY IF EXISTS "auth_select_vehicle_telemetry" ON public.vehicle_telemetry;
CREATE POLICY "auth_select_vehicle_telemetry" ON public.vehicle_telemetry
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_vehicle_telemetry" ON public.vehicle_telemetry;
CREATE POLICY "auth_insert_vehicle_telemetry" ON public.vehicle_telemetry
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_vehicle_telemetry" ON public.vehicle_telemetry;
CREATE POLICY "auth_update_vehicle_telemetry" ON public.vehicle_telemetry
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_vehicle_telemetry" ON public.vehicle_telemetry;
CREATE POLICY "auth_delete_vehicle_telemetry" ON public.vehicle_telemetry
  FOR DELETE TO authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_telemetry_vehicle_id ON public.vehicle_telemetry(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_telemetry_recorded_at ON public.vehicle_telemetry(recorded_at);
