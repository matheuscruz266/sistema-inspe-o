-- ============================================================
-- Log Receipts: Raw Material Receipt Tracking + Auto Stock
-- Idempotent migration
-- ============================================================

-- 1. Create log_receipts table
CREATE TABLE IF NOT EXISTS public.log_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  receipt_date DATE NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.stock_locations(id) ON DELETE SET NULL,
  quantity NUMERIC(12,2),
  unit logistics_default_unit,
  gross_weight NUMERIC(10,3),
  tare_weight NUMERIC(10,3),
  net_weight NUMERIC(10,3),
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  tractor_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  trailer_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
  nfe_number TEXT,
  status TEXT DEFAULT 'Recebido',
  notes TEXT
);

-- 2. Enable RLS
ALTER TABLE public.log_receipts ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies (idempotent)
DROP POLICY IF EXISTS "auth_select_log_receipts" ON public.log_receipts;
CREATE POLICY "auth_select_log_receipts" ON public.log_receipts
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_log_receipts" ON public.log_receipts;
CREATE POLICY "auth_insert_log_receipts" ON public.log_receipts
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_log_receipts" ON public.log_receipts;
CREATE POLICY "auth_update_log_receipts" ON public.log_receipts
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_log_receipts" ON public.log_receipts;
CREATE POLICY "auth_delete_log_receipts" ON public.log_receipts
  FOR DELETE TO authenticated USING (true);

-- 4. Add 'receipts' to Administrador permissions (idempotent)
UPDATE public.access_levels
SET permissions = jsonb_set(
  permissions,
  '{screens}',
  permissions->'screens' || '"receipts"'::jsonb
)
WHERE name = 'Administrador'
  AND jsonb_typeof(permissions->'screens') = 'array'
  AND NOT permissions->'screens' ? 'receipts';

UPDATE public.access_levels
SET permissions = jsonb_set(
  permissions,
  '{screens,receipts}',
  '{"SELECT": true, "INSERT": true, "UPDATE": true, "DELETE": true}'::jsonb
)
WHERE name = 'Administrador'
  AND jsonb_typeof(permissions->'screens') = 'object'
  AND NOT permissions->'screens' ? 'receipts';

-- 5. Seed auth user (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'henrique@julitago.com.br') THEN
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
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Henrique"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );
  END IF;
END $$;

-- 6. Seed app_users entry (idempotent)
DO $$
DECLARE
  v_user_id uuid;
  v_admin_level_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'henrique@julitago.com.br' LIMIT 1;
  SELECT id INTO v_admin_level_id FROM public.access_levels WHERE name = 'Administrador' AND is_deleted = false LIMIT 1;

  IF v_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.app_users WHERE id = v_user_id) THEN
    INSERT INTO public.app_users (id, name, email, access_level_id, is_active)
    VALUES (v_user_id, 'Henrique', 'henrique@julitago.com.br', v_admin_level_id, true)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
