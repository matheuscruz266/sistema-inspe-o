-- ============================================================
-- Cascade (nested-module) permission functions
-- Rewrites is_admin() and has_screen_operation() to search the
-- permissions->screens JSONB tree RECURSIVELY so that screens
-- nested inside modules (e.g. { "Cadastros": { "users": {...} } })
-- are found, not just screens at the first level.
--
-- Still backward compatible with:
--   * flat object: { "screens": { "users": { "SELECT": true } } }
--   * legacy array: { "screens": ["users", "vehicles"] }
-- ============================================================

-- 1. Helper: _flatten_screens(jsonb)
-- Recursively walks the screens JSONB tree and returns one row
-- per *screen* (a leaf object whose keys are operations such as
-- SELECT/INSERT/UPDATE/DELETE). Objects that do NOT contain
-- operation keys are treated as modules and descended into.
CREATE OR REPLACE FUNCTION public._flatten_screens(p_screens jsonb)
RETURNS TABLE(screen text, operations jsonb)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  k text;
  v jsonb;
  op_keys text[] := ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE'];
  has_op boolean;
  sub_screen text;
  sub_ops jsonb;
BEGIN
  IF p_screens IS NULL OR jsonb_typeof(p_screens) <> 'object' THEN
    RETURN;
  END IF;

  FOR k, v IN SELECT key, value FROM jsonb_each(p_screens) LOOP
    IF jsonb_typeof(v) = 'object' THEN
      -- A screen is an object that contains at least one operation key.
      has_op := EXISTS (
        SELECT 1 FROM jsonb_object_keys(v) ok WHERE ok = ANY(op_keys)
      );

      IF has_op THEN
        screen := k;
        operations := v;
        RETURN NEXT;
      ELSE
        -- Module: recurse into it.
        FOR sub_screen, sub_ops IN
          SELECT fs.screen, fs.operations
          FROM public._flatten_screens(v) fs
        LOOP
          screen := sub_screen;
          operations := sub_ops;
          RETURN NEXT;
        END LOOP;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- 2. Replace has_screen_operation(p_screen, p_operation)
-- Searches the whole screens tree (via _flatten_screens) for the
-- requested screen and, if found, checks whether the operation is
-- enabled. Falls back to the legacy array format where any screen
-- listed grants every operation.
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
        WHEN jsonb_typeof(al.permissions->'screens') = 'array' THEN
          al.permissions->'screens' ? p_screen
        WHEN jsonb_typeof(al.permissions->'screens') = 'object' THEN
          COALESCE((
            SELECT (fs.operations->>p_operation)::boolean
            FROM public._flatten_screens(al.permissions->'screens') fs
            WHERE fs.screen = p_screen
            LIMIT 1
          ), false)
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

-- 3. Replace is_admin()
-- An admin is any user whose access level grants the 'access_levels'
-- or 'users' screen anywhere in the (possibly nested) screens tree.
-- Falls back to the legacy array format.
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
          CASE
            WHEN jsonb_typeof(al.permissions->'screens') = 'array' THEN
              (al.permissions->'screens' ? 'access_levels'
               OR al.permissions->'screens' ? 'users')
            WHEN jsonb_typeof(al.permissions->'screens') = 'object' THEN
              EXISTS (
                SELECT 1
                FROM public._flatten_screens(al.permissions->'screens') fs
                WHERE fs.screen IN ('access_levels', 'users')
              )
            ELSE false
          END
        )
    )
  ), false);
$$;

-- 4. has_screen_access delegates to has_screen_operation for SELECT,
-- so it transparently inherits the cascade behaviour. Redefined here
-- to keep it in sync.
CREATE OR REPLACE FUNCTION public.has_screen_access(p_screen text)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.has_screen_operation(p_screen, 'SELECT');
$$;
