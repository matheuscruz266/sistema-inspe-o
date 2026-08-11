-- ============================================================
-- Per-Screen Operation Permission Matrix RLS
-- Supports per-operation (SELECT/INSERT/UPDATE/DELETE) permissions
-- stored in access_levels.permissions JSON as:
-- { "screens": { "<screen>": { "SELECT": true, "INSERT": false, ... } } }
-- Backward compatible with legacy array format:
-- { "screens": ["dashboard", "vehicles", ...] }
-- ============================================================

-- 1. Create has_screen_operation(p_screen, p_operation) function
CREATE OR REPLACE FUNCTION public.has_screen_operation(p_screen text, p_operation text)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE((
    SELECT
      CASE
        WHEN jsonb_typeof(al.permissions->'screens') = 'object' THEN
          COALESCE((al.permissions->'screens'->p_screen->>p_operation)::boolean, false)
        WHEN jsonb_typeof(al.permissions->'screens') = 'array' THEN
          al.permissions->'screens' ? p_screen
        ELSE false
      END
    FROM public.app_users au
    JOIN public.access_levels al ON al.id = au.access_level_id
    WHERE au.email = (auth.jwt() ->> 'email')
      AND COALESCE(au.is_deleted, false) = false
      AND COALESCE(al.is_deleted, false) = false
      AND al.is_active = true
  ), false);
$$;

-- 2. Update has_screen_access to delegate to has_screen_operation for SELECT
CREATE OR REPLACE FUNCTION public.has_screen_access(p_screen text)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.has_screen_operation(p_screen, 'SELECT');
$$;

-- 3. Replace all RLS policies with per-operation checks
DO $$
DECLARE
  tbl text;
  scr text;
  all_tables text[] := ARRAY[
    'access_levels', 'app_users', 'drivers', 'mechanics',
    'vehicles', 'vehicle_systems',
    'maintenance_plans', 'maintenance_plan_tasks', 'maintenance_plan_triggers',
    'maintenance_plan_materials', 'maintenance_plan_labor',
    'inspection_plans', 'inspection_plan_items', 'inspection_plan_consequences',
    'inspections', 'inspection_results', 'non_conformities',
    'work_orders', 'os_diagnosis', 'os_external', 'os_labor', 'os_materials', 'os_services',
    'products', 'product_classifications', 'product_units', 'product_applications',
    'product_equivalents', 'product_suppliers',
    'stock_movements', 'stock_locations', 'stock_batches', 'stock_inventory',
    'suppliers', 'service_catalog', 'people', 'schedule_records'
  ];
BEGIN
  FOREACH tbl IN ARRAY all_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "auth_select_%s" ON public.%I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "auth_insert_%s" ON public.%I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "auth_update_%s" ON public.%I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "auth_delete_%s" ON public.%I', tbl, tbl);

    scr := public.table_screen(tbl);

    IF tbl = 'access_levels' THEN
      EXECUTE format(
        'CREATE POLICY "auth_select_%s" ON public.%I FOR SELECT TO authenticated USING (true)',
        tbl, tbl
      );
      EXECUTE format(
        'CREATE POLICY "auth_insert_%s" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_admin())',
        tbl, tbl
      );
      EXECUTE format(
        'CREATE POLICY "auth_update_%s" ON public.%I FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())',
        tbl, tbl
      );
      EXECUTE format(
        'CREATE POLICY "auth_delete_%s" ON public.%I FOR DELETE TO authenticated USING (public.is_admin())',
        tbl, tbl
      );
    ELSIF tbl = 'app_users' THEN
      EXECUTE format(
        'CREATE POLICY "auth_select_%s" ON public.%I FOR SELECT TO authenticated USING (public.is_admin() OR id = auth.uid() OR public.has_screen_operation(%L, ''SELECT''))',
        tbl, tbl, scr
      );
      EXECUTE format(
        'CREATE POLICY "auth_insert_%s" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_admin() OR public.has_screen_operation(%L, ''INSERT''))',
        tbl, tbl, scr
      );
      EXECUTE format(
        'CREATE POLICY "auth_update_%s" ON public.%I FOR UPDATE TO authenticated USING (public.is_admin() OR public.has_screen_operation(%L, ''UPDATE'')) WITH CHECK (public.is_admin() OR public.has_screen_operation(%L, ''UPDATE''))',
        tbl, tbl, scr, scr
      );
      EXECUTE format(
        'CREATE POLICY "auth_delete_%s" ON public.%I FOR DELETE TO authenticated USING (public.is_admin() OR public.has_screen_operation(%L, ''DELETE''))',
        tbl, tbl, scr
      );
    ELSE
      EXECUTE format(
        'CREATE POLICY "auth_select_%s" ON public.%I FOR SELECT TO authenticated USING (public.is_admin() OR public.has_screen_operation(%L, ''SELECT''))',
        tbl, tbl, scr
      );
      EXECUTE format(
        'CREATE POLICY "auth_insert_%s" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_admin() OR public.has_screen_operation(%L, ''INSERT''))',
        tbl, tbl, scr
      );
      EXECUTE format(
        'CREATE POLICY "auth_update_%s" ON public.%I FOR UPDATE TO authenticated USING (public.is_admin() OR public.has_screen_operation(%L, ''UPDATE'')) WITH CHECK (public.is_admin() OR public.has_screen_operation(%L, ''UPDATE''))',
        tbl, tbl, scr, scr
      );
      EXECUTE format(
        'CREATE POLICY "auth_delete_%s" ON public.%I FOR DELETE TO authenticated USING (public.is_admin() OR public.has_screen_operation(%L, ''DELETE''))',
        tbl, tbl, scr
      );
    END IF;
  END LOOP;
END $$;

-- 4. Ensure current_stock view grant
GRANT SELECT ON public.current_stock TO authenticated;
