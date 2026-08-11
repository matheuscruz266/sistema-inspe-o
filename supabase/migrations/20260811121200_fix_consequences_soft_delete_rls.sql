-- 1. Add is_deleted to inspection_plan_consequences
ALTER TABLE public.inspection_plan_consequences ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- 2. Ensure RLS enabled and policies for inspection_plan_consequences
ALTER TABLE public.inspection_plan_consequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_inspection_plan_consequences" ON public.inspection_plan_consequences;
CREATE POLICY "auth_select_inspection_plan_consequences" ON public.inspection_plan_consequences
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_inspection_plan_consequences" ON public.inspection_plan_consequences;
CREATE POLICY "auth_insert_inspection_plan_consequences" ON public.inspection_plan_consequences
  FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_inspection_plan_consequences" ON public.inspection_plan_consequences;
CREATE POLICY "auth_update_inspection_plan_consequences" ON public.inspection_plan_consequences
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_inspection_plan_consequences" ON public.inspection_plan_consequences;
CREATE POLICY "auth_delete_inspection_plan_consequences" ON public.inspection_plan_consequences
  FOR DELETE TO authenticated USING (true);

-- 3. Ensure RLS for stock_inventory
ALTER TABLE public.stock_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_stock_inventory" ON public.stock_inventory;
CREATE POLICY "auth_select_stock_inventory" ON public.stock_inventory
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_stock_inventory" ON public.stock_inventory;
CREATE POLICY "auth_insert_stock_inventory" ON public.stock_inventory
  FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_stock_inventory" ON public.stock_inventory;
CREATE POLICY "auth_update_stock_inventory" ON public.stock_inventory
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_stock_inventory" ON public.stock_inventory;
CREATE POLICY "auth_delete_stock_inventory" ON public.stock_inventory
  FOR DELETE TO authenticated USING (true);

-- 4. Ensure RLS for stock_movements
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_stock_movements" ON public.stock_movements;
CREATE POLICY "auth_select_stock_movements" ON public.stock_movements
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_stock_movements" ON public.stock_movements;
CREATE POLICY "auth_insert_stock_movements" ON public.stock_movements
  FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_stock_movements" ON public.stock_movements;
CREATE POLICY "auth_update_stock_movements" ON public.stock_movements
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_stock_movements" ON public.stock_movements;
CREATE POLICY "auth_delete_stock_movements" ON public.stock_movements
  FOR DELETE TO authenticated USING (true);

-- 5. Ensure RLS for people
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_people" ON public.people;
CREATE POLICY "auth_select_people" ON public.people
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_people" ON public.people;
CREATE POLICY "auth_insert_people" ON public.people
  FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_people" ON public.people;
CREATE POLICY "auth_update_people" ON public.people
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_people" ON public.people;
CREATE POLICY "auth_delete_people" ON public.people
  FOR DELETE TO authenticated USING (true);

-- 6. Ensure RLS for stock_locations
ALTER TABLE public.stock_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_stock_locations" ON public.stock_locations;
CREATE POLICY "auth_select_stock_locations" ON public.stock_locations
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_stock_locations" ON public.stock_locations;
CREATE POLICY "auth_insert_stock_locations" ON public.stock_locations
  FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_stock_locations" ON public.stock_locations;
CREATE POLICY "auth_update_stock_locations" ON public.stock_locations
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_stock_locations" ON public.stock_locations;
CREATE POLICY "auth_delete_stock_locations" ON public.stock_locations
  FOR DELETE TO authenticated USING (true);

-- 7. Update admin permissions to include 'people' and unified screens
UPDATE public.access_levels
SET permissions = '{"screens": ["dashboard","vehicles","components","maintenance_plans","inspection_plans","entries","scheduling","stock","products","people","suppliers","service_catalog","history","indicators","dash_maintenance","access_levels","users"]}'::jsonb
WHERE name = 'Administrador';
