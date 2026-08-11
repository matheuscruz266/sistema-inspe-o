-- ============================================================
-- Access-Level-Based RLS Policies
-- Replaces overly permissive USING (true) policies with
-- access-level-based restrictions.
-- ============================================================

-- 1. Helper function: is_admin()
-- Returns true if the authenticated user has admin-level access
-- (determined by having 'access_levels' or 'users' in their
-- access_levels.permissions.screens JSON array)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE((
    SELECT EXISTS (
      SELECT 1
      FROM public.app_users au
      JOIN public.access_levels al ON al.id = au.access_level_id
      WHERE au.email = (auth.jwt() ->> 'email')
        AND COALESCE(au.is_deleted, false) = false
        AND COALESCE(al.is_deleted, false) = false
        AND al.is_active = true
        AND (
          al.permissions->'screens' ? 'access_levels'
          OR al.permissions->'screens' ? 'users'
        )
    )
  ), false);
$$;

-- 2. Helper function: has_screen_access(p_screen)
-- Returns true if the authenticated user has the given screen
-- in their access_levels.permissions.screens JSON array
CREATE OR REPLACE FUNCTION public.has_screen_access(p_screen text)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE((
    SELECT EXISTS (
      SELECT 1
      FROM public.app_users au
      JOIN public.access_levels al ON al.id = au.access_level_id
      WHERE au.email = (auth.jwt() ->> 'email')
        AND COALESCE(au.is_deleted, false) = false
        AND COALESCE(al.is_deleted, false) = false
        AND al.is_active = true
        AND al.permissions->'screens' ? p_screen
    )
  ), false);
$$;

-- 3. Helper function: table_screen(p_table)
-- Maps a table name to its corresponding screen name for RLS
CREATE OR REPLACE FUNCTION public.table_screen(p_table text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_table = 'access_levels' THEN 'access_levels'
    WHEN p_table = 'app_users' THEN 'users'
    WHEN p_table IN ('drivers', 'mechanics') THEN 'people'
    WHEN p_table = 'vehicles' THEN 'vehicles'
    WHEN p_table = 'vehicle_systems' THEN 'components'
    WHEN p_table LIKE 'maintenance_plan%' THEN 'maintenance_plans'
    WHEN p_table LIKE 'inspection_plan%' THEN 'inspection_plans'
    WHEN p_table IN ('inspections', 'inspection_results', 'non_conformities') THEN 'entries'
    WHEN p_table = 'work_orders' OR p_table LIKE 'os_%' THEN 'entries'
    WHEN p_table = 'products' OR p_table LIKE 'product_%' THEN 'products'
    WHEN p_table LIKE 'stock_%' THEN 'stock'
    WHEN p_table = 'suppliers' THEN 'suppliers'
    WHEN p_table = 'service_catalog' THEN 'service_catalog'
    WHEN p_table = 'people' THEN 'people'
    WHEN p_table = 'schedule_records' THEN 'scheduling'
    ELSE 'dashboard'
  END;
$$;

-- 4. Replace all policies with access-level-based ones
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
    -- Drop all existing policies
    EXECUTE format('DROP POLICY IF EXISTS "auth_select_%s" ON public.%I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "auth_insert_%s" ON public.%I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "auth_update_%s" ON public.%I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "auth_delete_%s" ON public.%I', tbl, tbl);

    scr := public.table_screen(tbl);

    -- Special case: access_levels SELECT is open to all authenticated
    -- (reference data needed for the auth flow to resolve permissions)
    IF tbl = 'access_levels' THEN
      EXECUTE format(
        'CREATE POLICY "auth_select_%s" ON public.%I FOR SELECT TO authenticated USING (true)',
        tbl, tbl
      );
    -- Special case: app_users SELECT allows reading own row
    ELSIF tbl = 'app_users' THEN
      EXECUTE format(
        'CREATE POLICY "auth_select_%s" ON public.%I FOR SELECT TO authenticated USING (public.is_admin() OR id = auth.uid() OR public.has_screen_access(%L))',
        tbl, tbl, scr
      );
    -- Standard: SELECT requires admin OR screen access
    ELSE
      EXECUTE format(
        'CREATE POLICY "auth_select_%s" ON public.%I FOR SELECT TO authenticated USING (public.is_admin() OR public.has_screen_access(%L))',
        tbl, tbl, scr
      );
    END IF;

    -- INSERT: admin only
    EXECUTE format(
      'CREATE POLICY "auth_insert_%s" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_admin())',
      tbl, tbl
    );

    -- UPDATE: admin only
    EXECUTE format(
      'CREATE POLICY "auth_update_%s" ON public.%I FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())',
      tbl, tbl
    );

    -- DELETE: admin only
    EXECUTE format(
      'CREATE POLICY "auth_delete_%s" ON public.%I FOR DELETE TO authenticated USING (public.is_admin())',
      tbl, tbl
    );
  END LOOP;
END $$;

-- 5. Ensure current_stock view grant is still present
GRANT SELECT ON public.current_stock TO authenticated;
