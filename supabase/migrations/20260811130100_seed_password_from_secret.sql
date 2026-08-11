-- ============================================================
-- Seed Password Security: Update seed user password from
-- a Supabase secret / GUC instead of a hardcoded literal.
--
-- Before running this migration, set the GUC:
--   ALTER DATABASE postgres SET app.seed_user_password = 'your_password';
-- Or set it as a session-level GUC before running the migration.
-- If the GUC is not set, the password is not updated and a
-- NOTICE is raised.
-- ============================================================

DO $$
DECLARE
  v_password text;
BEGIN
  -- Attempt to read the password from the GUC (does not throw if missing)
  v_password := current_setting('app.seed_user_password', true);

  IF v_password IS NOT NULL AND v_password <> '' THEN
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'henrique@julitago.com.br') THEN
      UPDATE auth.users
      SET encrypted_password = crypt(v_password, gen_salt('bf')),
          updated_at = NOW()
      WHERE email = 'henrique@julitago.com.br';
      RAISE NOTICE 'Seed user password updated from app.seed_user_password setting';
    ELSE
      INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
        is_super_admin, role, aud,
        confirmation_token, recovery_token, email_change_token_new,
        email_change, email_change_token_current,
        phone, phone_change, phone_change_token, reauthentication_token
      ) VALUES (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000000',
        'henrique@julitago.com.br',
        crypt(v_password, gen_salt('bf')),
        NOW(), NOW(), NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"name": "Administrador"}',
        false, 'authenticated', 'authenticated',
        '', '', '', '', '',
        NULL, '', '', ''
      );

      INSERT INTO public.app_users (id, name, email, is_active, is_deleted)
      SELECT id, 'Administrador', email, true, false
      FROM auth.users WHERE email = 'henrique@julitago.com.br'
      ON CONFLICT (id) DO NOTHING;

      RAISE NOTICE 'Seed user created with password from app.seed_user_password setting';
    END IF;
  ELSE
    RAISE NOTICE 'app.seed_user_password GUC not set. Seed user password not updated. Set it with: ALTER DATABASE current_database() SET app.seed_user_password = ''your_password'';';
  END IF;
END $$;
