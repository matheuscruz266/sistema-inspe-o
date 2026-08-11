-- Ensure app_users has RLS policies for authenticated INSERT (idempotent)
DROP POLICY IF EXISTS "auth_insert_app_users" ON public.app_users;
CREATE POLICY "auth_insert_app_users" ON public.app_users
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_select_app_users" ON public.app_users;
CREATE POLICY "auth_select_app_users" ON public.app_users
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_update_app_users" ON public.app_users;
CREATE POLICY "auth_update_app_users" ON public.app_users
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_app_users" ON public.app_users;
CREATE POLICY "auth_delete_app_users" ON public.app_users
  FOR DELETE TO authenticated USING (true);
