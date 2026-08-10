DO $$
DECLARE
  admin_id uuid;
  level_id uuid;
BEGIN
  INSERT INTO public.access_levels (id, name, permissions, is_active)
  VALUES (
    gen_random_uuid(),
    'Administrador',
    '{"screens": ["dashboard","vehicles","maintenance_plans","inspection_plans","entries","scheduling","stock","products","mechanics","drivers","access_levels","users"]}'::jsonb,
    true
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO level_id;

  IF level_id IS NULL THEN
    SELECT id INTO level_id FROM public.access_levels WHERE name = 'Administrador' LIMIT 1;
  END IF;

  INSERT INTO public.access_levels (id, name, permissions, is_active)
  VALUES (
    gen_random_uuid(),
    'Motorista',
    '{"screens": ["dashboard","entries"]}'::jsonb,
    true
  )
  ON CONFLICT DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'henrique@julitago.com.br') THEN
    admin_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      admin_id,
      '00000000-0000-0000-0000-000000000000',
      'henrique@julitago.com.br',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Administrador"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );

    INSERT INTO public.app_users (id, name, email, access_level_id, is_active)
    VALUES (admin_id, 'Administrador', 'henrique@julitago.com.br', level_id, true)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

INSERT INTO public.vehicles (plate, cost_center, brand, model, axles_count, vehicle_type, year, purchase_cost) VALUES
  ('ABC1D23', 'CC-001', 'Scania', 'R450', 6, 'Cavalo 6x4', 2022, 450000.00),
  ('DEF2G34', 'CC-002', 'Mercedes-Benz', 'Actros 2651', 6, 'Cavalo 6x2', 2021, 420000.00),
  ('GHI3H45', 'CC-001', 'Randon', 'LS 3 Eixos', 3, 'Carreta LS', 2020, 120000.00),
  ('JKL4I56', 'CC-003', 'Volvo', 'FH 540', 4, 'Bi-truck', 2023, 480000.00)
ON CONFLICT DO NOTHING;

INSERT INTO public.products (name, code, category, unit, min_quantity, unit_value, supplier) VALUES
  ('Filtro de Óleo Motor', 'FO-001', 'Peça', 'Un', 10, 45.50, 'Auto Peças Silva'),
  ('Óleo Diesel 15W40', 'OL-002', 'Lubrificante', 'Lt', 50, 28.90, 'Petrobras'),
  ('Pastilha de Freio', 'PF-003', 'Peça', 'Un', 8, 120.00, 'Bosch'),
  ('Graxa Multiuso', 'GR-004', 'Insumo', 'Kg', 5, 15.00, 'TecnoLub'),
  ('Correia V', 'CV-005', 'Peça', 'Un', 3, 85.00, 'Gates')
ON CONFLICT DO NOTHING;

INSERT INTO public.mechanics (name, cpf, phone, whatsapp, specialty, hourly_rate, status) VALUES
  ('João Silva', '123.456.789-00', '(11) 99999-1111', '(11) 99999-1111', 'Motor', 65.00, 'Ativo'),
  ('Carlos Santos', '987.654.321-00', '(11) 98888-2222', '(11) 98888-2222', 'Elétrica', 70.00, 'Ativo')
ON CONFLICT DO NOTHING;

INSERT INTO public.drivers (name, cpf, birth_date, phone, whatsapp) VALUES
  ('Pedro Oliveira', '111.222.333-44', '1985-03-15', '(11) 97777-3333', '(11) 97777-3333'),
  ('Marcos Lima', '444.555.666-77', '1990-07-22', '(11) 96666-4444', '(11) 96666-4444')
ON CONFLICT DO NOTHING;

INSERT INTO public.maintenance_plans (name, type, periodicity, target_vehicle_type, responsible, status, next_execution, checklist) VALUES
  ('Troca de Óleo 10mil km', 'Preventiva', '10.000 km', 'Ambos', 'Oficina Interna', 'Ativo', '2026-09-01', '["Verificar nível do óleo","Trocar filtro","Inspecionar vazamentos"]'),
  ('Revisão de Freios', 'Preventiva', '20.000 km', 'Ambos', 'Oficina Interna', 'Ativo', '2026-08-20', '["Inspecionar pastilhas","Verificar lonas","Sangrar sistema"]')
ON CONFLICT DO NOTHING;

INSERT INTO public.inspection_plans (plate, vehicle_type, periodicity, responsible, last_inspection, next_inspection, checklist, status) VALUES
  ('ABC1D23', 'Cavalo Mecânico', 'Diária', 'Motorista', '2026-08-09', '2026-08-10', '["Luzes","Pneus","Freios"]', 'Em Dia'),
  ('DEF2G34', 'Cavalo Mecânico', 'Semanal', 'Oficina Interna', '2026-08-05', '2026-08-12', '["Óleo","Água","Bateria"]', 'Pendente')
ON CONFLICT DO NOTHING;

INSERT INTO public.work_orders (date, plate, type, diagnosis, parts_cost, hours, external_cost, mechanic, status, total_cost, parts, scheduled_date) VALUES
  ('2026-08-05', 'ABC1D23', 'Corretiva', 'Vazamento de óleo no cárter', 180.50, 3.5, 0.00, 'João Silva', 'Concluída', 408.00, '[{"product_name":"Filtro de Óleo Motor","quantity":2,"unit_value":45.50}]'::jsonb, NULL),
  ('2026-08-08', 'DEF2G34', 'Preventiva', 'Revisão 20mil km', 240.00, 2.0, 50.00, 'Carlos Santos', 'Em Andamento', 430.00, '[{"product_name":"Pastilha de Freio","quantity":2,"unit_value":120.00}]'::jsonb, NULL),
  ('2026-08-12', 'GHI3H45', 'Preventiva', 'Troca de óleo', 86.70, 1.0, 0.00, 'João Silva', 'Aberta', 151.70, '[]'::jsonb, '2026-08-12')
ON CONFLICT DO NOTHING;

INSERT INTO public.inspections (date, plate, type, driver_name, status, failed_items, notes) VALUES
  ('2026-08-10', 'ABC1D23', 'Diária', 'Pedro Oliveira', 'OK', '[]', 'Tudo em ordem'),
  ('2026-08-09', 'DEF2G34', 'Diária', 'Marcos Lima', 'Atenção', '["Luz de freio queimada"]', 'Trocar lâmpada com urgência')
ON CONFLICT DO NOTHING;

INSERT INTO public.stock_movements (product_id, movement_type, quantity, unit_value, reason, reference) VALUES
  (p1.id, 'entrada', 20, 45.50, 'Compra inicial', NULL)
  FROM public.products p1 WHERE p1.code = 'FO-001'
  ON CONFLICT DO NOTHING;
INSERT INTO public.stock_movements (product_id, movement_type, quantity, unit_value, reason, reference)
  SELECT p.id, 'entrada', 100, 28.90, 'Compra inicial', NULL FROM public.products p WHERE p.code = 'OL-002'
  ON CONFLICT DO NOTHING;
INSERT INTO public.stock_movements (product_id, movement_type, quantity, unit_value, reason, reference)
  SELECT p.id, 'entrada', 15, 120.00, 'Compra inicial', NULL FROM public.products p WHERE p.code = 'PF-003'
  ON CONFLICT DO NOTHING;
INSERT INTO public.stock_movements (product_id, movement_type, quantity, unit_value, reason, reference)
  SELECT p.id, 'saida', 2, 45.50, 'OS: Vazamento de óleo', NULL FROM public.products p WHERE p.code = 'FO-001'
  ON CONFLICT DO NOTHING;
INSERT INTO public.stock_movements (product_id, movement_type, quantity, unit_value, reason, reference)
  SELECT p.id, 'saida', 5, 28.90, 'Abastecimento', NULL FROM public.products p WHERE p.code = 'OL-002'
  ON CONFLICT DO NOTHING;
