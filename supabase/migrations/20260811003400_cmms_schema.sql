-- ============================================================
-- CMMS Schema: New tables + column additions + RLS policies
-- ============================================================

-- 1. suppliers (needed for FK from products)
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cnpj TEXT,
  contact TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. service_catalog
CREATE TABLE IF NOT EXISTS public.service_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT DEFAULT 'Un',
  standard_rate NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. vehicle_systems (components / hierarchy)
CREATE TABLE IF NOT EXISTS public.vehicle_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.vehicle_systems(id) ON DELETE CASCADE,
  system_name TEXT NOT NULL,
  component_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. maintenance_plan_tasks
CREATE TABLE IF NOT EXISTS public.maintenance_plan_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.maintenance_plans(id) ON DELETE CASCADE,
  sequence INTEGER DEFAULT 1,
  description TEXT NOT NULL,
  task_type TEXT DEFAULT 'Inspeção',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. maintenance_plan_triggers
CREATE TABLE IF NOT EXISTS public.maintenance_plan_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.maintenance_plans(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
  value NUMERIC(12,2),
  unit TEXT,
  last_event_date DATE,
  last_event_value NUMERIC(12,2),
  next_event_date DATE,
  next_event_value NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. maintenance_plan_materials
CREATE TABLE IF NOT EXISTS public.maintenance_plan_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.maintenance_plans(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT,
  planned_quantity NUMERIC(12,2) DEFAULT 1,
  unit TEXT DEFAULT 'Un',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. maintenance_plan_labor
CREATE TABLE IF NOT EXISTS public.maintenance_plan_labor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.maintenance_plans(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  planned_hours NUMERIC(8,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. inspection_plan_items
CREATE TABLE IF NOT EXISTS public.inspection_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.inspection_plans(id) ON DELETE CASCADE,
  sequence INTEGER DEFAULT 1,
  item TEXT NOT NULL,
  verification TEXT,
  response_type TEXT DEFAULT 'OK / NOK',
  expected_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. inspection_plan_consequences
CREATE TABLE IF NOT EXISTS public.inspection_plan_consequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.inspection_plans(id) ON DELETE CASCADE,
  result_classification TEXT NOT NULL,
  action TEXT NOT NULL,
  priority TEXT DEFAULT 'Normal',
  generates_os BOOLEAN DEFAULT false,
  blocks_vehicle BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. inspection_results
CREATE TABLE IF NOT EXISTS public.inspection_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.inspection_plan_items(id) ON DELETE SET NULL,
  result_value TEXT,
  status TEXT DEFAULT 'OK',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. non_conformities
CREATE TABLE IF NOT EXISTS public.non_conformities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.inspection_plan_items(id) ON DELETE SET NULL,
  result_value TEXT,
  classification TEXT NOT NULL,
  criticality TEXT DEFAULT 'Média',
  generates_os BOOLEAN DEFAULT false,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'Aberta',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. os_labor
CREATE TABLE IF NOT EXISTS public.os_labor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  mechanic_name TEXT NOT NULL,
  role TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  hours NUMERIC(8,2) DEFAULT 0,
  hourly_rate NUMERIC(12,2) DEFAULT 0,
  cost NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. os_materials
CREATE TABLE IF NOT EXISTS public.os_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT,
  quantity NUMERIC(12,2) DEFAULT 0,
  unit TEXT DEFAULT 'Un',
  unit_cost NUMERIC(12,2) DEFAULT 0,
  total_cost NUMERIC(12,2) DEFAULT 0,
  batch TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. os_services
CREATE TABLE IF NOT EXISTS public.os_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  duration NUMERIC(8,2) DEFAULT 0,
  equipment_used TEXT,
  cost NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. os_external
CREATE TABLE IF NOT EXISTS public.os_external (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT,
  work_description TEXT,
  labor_cost NUMERIC(12,2) DEFAULT 0,
  parts_cost NUMERIC(12,2) DEFAULT 0,
  service_cost NUMERIC(12,2) DEFAULT 0,
  freight_cost NUMERIC(12,2) DEFAULT 0,
  other_cost NUMERIC(12,2) DEFAULT 0,
  invoice_number TEXT,
  total_cost NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. os_diagnosis
CREATE TABLE IF NOT EXISTS public.os_diagnosis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  symptom TEXT,
  failure TEXT,
  cause TEXT,
  action TEXT,
  system TEXT,
  component TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. product_classifications
CREATE TABLE IF NOT EXISTS public.product_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  category TEXT,
  subcategory TEXT,
  group_name TEXT,
  subgroup TEXT,
  brand TEXT,
  manufacturer TEXT,
  family TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. product_units
CREATE TABLE IF NOT EXISTS public.product_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  stock_unit TEXT NOT NULL,
  purchase_unit TEXT NOT NULL,
  conversion_factor NUMERIC(12,4) DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 19. product_applications
CREATE TABLE IF NOT EXISTS public.product_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  vehicle_brand TEXT,
  vehicle_model TEXT,
  vehicle_plate TEXT,
  system TEXT,
  component TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. product_equivalents
CREATE TABLE IF NOT EXISTS public.product_equivalents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  equivalent_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  equivalent_code TEXT,
  equivalent_brand TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 21. stock_locations
CREATE TABLE IF NOT EXISTS public.stock_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  warehouse TEXT,
  physical_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 22. stock_batches
CREATE TABLE IF NOT EXISTS public.stock_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.stock_locations(id) ON DELETE SET NULL,
  batch_number TEXT,
  quantity NUMERIC(12,2) DEFAULT 0,
  validity DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 23. schedule_records
CREATE TABLE IF NOT EXISTS public.schedule_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.maintenance_plans(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Prevista',
  executed_date DATE,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ALTER existing tables: add new columns
-- ============================================================

ALTER TABLE public.maintenance_plans ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.maintenance_plans ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.maintenance_plans ADD COLUMN IF NOT EXISTS criticidade TEXT DEFAULT 'Média';
ALTER TABLE public.maintenance_plans ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Normal';
ALTER TABLE public.maintenance_plans ADD COLUMN IF NOT EXISTS application_type TEXT;
ALTER TABLE public.maintenance_plans ADD COLUMN IF NOT EXISTS application_target TEXT;

ALTER TABLE public.inspection_plans ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.inspection_plans ADD COLUMN IF NOT EXISTS criticidade TEXT DEFAULT 'Média';

ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS odometer NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS horimeter NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS cost_center TEXT;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS origin TEXT DEFAULT 'Preventiva';
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS implement_plate TEXT;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS maintenance_plan_id UUID REFERENCES public.maintenance_plans(id) ON DELETE SET NULL;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS labor_cost NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS freight_cost NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS other_cost NUMERIC(12,2) DEFAULT 0;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS manufacturer_code TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS oem_code TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_code TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ean TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS group_name TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS subgroup TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS manufacturer TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS family TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS max_quantity NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS safety_quantity NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS warehouse TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS physical_address TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS batch TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS validity DATE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS main_supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;

ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.stock_locations(id) ON DELETE SET NULL;
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.stock_batches(id) ON DELETE SET NULL;

-- ============================================================
-- RLS: enable + policies for all new tables
-- ============================================================

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_plan_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_plan_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_plan_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_plan_labor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_plan_consequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.non_conformities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_labor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_external ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_diagnosis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_equivalents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_records ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'suppliers','service_catalog','vehicle_systems',
    'maintenance_plan_tasks','maintenance_plan_triggers','maintenance_plan_materials','maintenance_plan_labor',
    'inspection_plan_items','inspection_plan_consequences','inspection_results','non_conformities',
    'os_labor','os_materials','os_services','os_external','os_diagnosis',
    'product_classifications','product_units','product_applications','product_equivalents',
    'stock_locations','stock_batches','schedule_records'
  ];
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
