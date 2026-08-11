-- Update admin permissions to include new screens
UPDATE public.access_levels
SET permissions = '{"screens": ["dashboard","vehicles","components","maintenance_plans","inspection_plans","entries","scheduling","stock","products","mechanics","drivers","suppliers","service_catalog","history","indicators","access_levels","users"]}'::jsonb
WHERE name = 'Administrador';

-- Suppliers
INSERT INTO public.suppliers (name, cnpj, contact, phone, email) VALUES
  ('Auto Peças Silva', '12.345.678/0001-90', 'Carlos Silva', '(11) 3333-1111', 'contato@autosilva.com.br'),
  ('Bosch Brasil', '45.678.901/0001-23', 'Ana Bosch', '(11) 3333-2222', 'vendas@bosch.com.br'),
  ('TecnoLub Distribuidora', '78.901.234/0001-56', 'Paulo Tec', '(11) 3333-3333', 'comercial@tecnolub.com.br')
ON CONFLICT DO NOTHING;

-- Service Catalog
INSERT INTO public.service_catalog (code, name, description, unit, standard_rate) VALUES
  ('SRV-001', 'Troca de Óleo', 'Serviço de troca de óleo e filtro', 'Un', 80.00),
  ('SRV-002', 'Revisão de Freios', 'Inspeção e manutenção do sistema de freios', 'Un', 150.00),
  ('SRV-003', 'Diagnóstico Eletrônico', 'Scanner e diagnóstico de falhas', 'Un', 120.00),
  ('SRV-004', 'Alinhamento e Balanceamento', 'Alinhamento de eixos e balanceamento de rodas', 'Un', 90.00)
ON CONFLICT DO NOTHING;

-- Stock Locations
INSERT INTO public.stock_locations (name, warehouse, physical_address) VALUES
  ('Almoxarifado Central', 'Galpão 01', 'Rua A, Setor 1'),
  ('Oficina Interna', 'Galpão 02', 'Rua B, Setor 2')
ON CONFLICT DO NOTHING;

-- Vehicle Systems for ABC1D23
INSERT INTO public.vehicle_systems (vehicle_id, system_name, component_name)
SELECT v.id, s.sys, s.comp FROM public.vehicles v
CROSS JOIN (VALUES
  ('Motor', 'Sistema de lubrificação'),
  ('Motor', 'Sistema de combustível'),
  ('Motor', 'Arrefecimento'),
  ('Transmissão', 'Embreagem'),
  ('Transmissão', 'Caixa de câmbio'),
  ('Freios', 'Compressor'),
  ('Freios', 'Pastilhas e lonas'),
  ('Suspensão', 'Molas'),
  ('Elétrica', 'Bateria'),
  ('Elétrica', 'Alternador')
) AS s(sys, comp)
WHERE v.plate = 'ABC1D23'
ON CONFLICT DO NOTHING;

-- Maintenance Plan Tasks for "Troca de Óleo 10mil km"
INSERT INTO public.maintenance_plan_tasks (plan_id, sequence, description, task_type)
SELECT id, seq, descr, ttype FROM public.maintenance_plans
CROSS JOIN (VALUES
  (1, 'Trocar óleo do motor', 'Substituição'),
  (2, 'Substituir filtro de óleo', 'Substituição'),
  (3, 'Inspecionar correias', 'Inspeção'),
  (4, 'Inspecionar vazamentos', 'Inspeção'),
  (5, 'Verificar nível do arrefecimento', 'Verificação'),
  (6, 'Lubrificar pontos previstos', 'Lubrificação')
) AS t(seq, descr, ttype)
WHERE name = 'Troca de Óleo 10mil km'
ON CONFLICT DO NOTHING;

-- Maintenance Plan Triggers for "Troca de Óleo 10mil km"
INSERT INTO public.maintenance_plan_triggers (plan_id, trigger_type, value, unit, last_event_date, next_event_date)
SELECT id, 'km', 10000, 'km', '2026-06-01', '2026-09-01' FROM public.maintenance_plans WHERE name = 'Troca de Óleo 10mil km'
ON CONFLICT DO NOTHING;

INSERT INTO public.maintenance_plan_triggers (plan_id, trigger_type, value, unit, last_event_date, next_event_date)
SELECT id, 'time', 6, 'meses', '2026-06-01', '2026-12-01' FROM public.maintenance_plans WHERE name = 'Troca de Óleo 10mil km'
ON CONFLICT DO NOTHING;

-- Maintenance Plan Materials
INSERT INTO public.maintenance_plan_materials (plan_id, product_id, product_name, planned_quantity, unit)
SELECT mp.id, p.id, p.name, 15, 'Lt' FROM public.maintenance_plans mp, public.products p
WHERE mp.name = 'Troca de Óleo 10mil km' AND p.code = 'OL-002'
ON CONFLICT DO NOTHING;

INSERT INTO public.maintenance_plan_materials (plan_id, product_id, product_name, planned_quantity, unit)
SELECT mp.id, p.id, p.name, 1, 'Un' FROM public.maintenance_plans mp, public.products p
WHERE mp.name = 'Troca de Óleo 10mil km' AND p.code = 'FO-001'
ON CONFLICT DO NOTHING;

-- Maintenance Plan Labor
INSERT INTO public.maintenance_plan_labor (plan_id, role, quantity, planned_hours)
SELECT id, 'Mecânico', 1, 2.5 FROM public.maintenance_plans WHERE name = 'Troca de Óleo 10mil km'
ON CONFLICT DO NOTHING;

-- Inspection Plan Items for ABC1D23 plan
INSERT INTO public.inspection_plan_items (plan_id, sequence, item, verification, response_type)
SELECT id, seq, item_text, verif, rtype FROM public.inspection_plans
CROSS JOIN (VALUES
  (1, 'Nível de óleo', 'Verificar nível do óleo do motor', 'OK / NOK'),
  (2, 'Vazamento de óleo', 'Inspecionar vazamentos', 'OK / NOK'),
  (3, 'Pneus', 'Verificar condição e pressão', 'Conforme / Não conforme'),
  (4, 'Luzes', 'Testar faróis e lanternas', 'OK / NOK'),
  (5, 'Freio', 'Verificar freio de serviço e estacionamento', 'OK / NOK'),
  (6, 'Quinta roda', 'Inspecionar quinta roda', 'OK / NOK'),
  (7, 'Mangueiras', 'Inspecionar mangueiras de ar', 'OK / NOK')
) AS t(seq, item_text, verif, rtype)
WHERE plate = 'ABC1D23'
ON CONFLICT DO NOTHING;

-- Inspection Plan Consequences
INSERT INTO public.inspection_plan_consequences (plan_id, result_classification, action, priority, generates_os, blocks_vehicle)
SELECT id, 'NOK crítico', 'Veículo bloqueado, gera OS imediatamente', 'Crítica', true, true FROM public.inspection_plans WHERE plate = 'ABC1D23'
ON CONFLICT DO NOTHING;

INSERT INTO public.inspection_plan_consequences (plan_id, result_classification, action, priority, generates_os, blocks_vehicle)
SELECT id, 'NOK grave', 'Gera OS com prioridade alta', 'Alta', true, false FROM public.inspection_plans WHERE plate = 'ABC1D23'
ON CONFLICT DO NOTHING;

INSERT INTO public.inspection_plan_consequences (plan_id, result_classification, action, priority, generates_os, blocks_vehicle)
SELECT id, 'NOK moderado', 'Gera pendência para acompanhamento', 'Normal', false, false FROM public.inspection_plans WHERE plate = 'ABC1D23'
ON CONFLICT DO NOTHING;

-- Schedule Records
INSERT INTO public.schedule_records (plan_id, vehicle_id, scheduled_date, status)
SELECT mp.id, v.id, '2026-09-01', 'Programada' FROM public.maintenance_plans mp, public.vehicles v
WHERE mp.name = 'Troca de Óleo 10mil km' AND v.plate = 'ABC1D23'
ON CONFLICT DO NOTHING;

INSERT INTO public.schedule_records (plan_id, vehicle_id, scheduled_date, status)
SELECT mp.id, v.id, '2026-08-20', 'Atrasada' FROM public.maintenance_plans mp, public.vehicles v
WHERE mp.name = 'Revisão de Freios' AND v.plate = 'DEF2G34'
ON CONFLICT DO NOTHING;

INSERT INTO public.schedule_records (plan_id, vehicle_id, scheduled_date, status, executed_date)
SELECT mp.id, v.id, '2026-07-15', 'Executada', '2026-07-14' FROM public.maintenance_plans mp, public.vehicles v
WHERE mp.name = 'Troca de Óleo 10mil km' AND v.plate = 'DEF2G34'
ON CONFLICT DO NOTHING;

-- Non-conformities (linked to existing inspection)
INSERT INTO public.non_conformities (inspection_id, result_value, classification, criticality, generates_os, status)
SELECT i.id, 'Luz de freio queimada', 'NOK grave', 'Alta', true, 'Aberta'
FROM public.inspections i WHERE i.plate = 'DEF2G34' AND i.status = 'Atenção'
ON CONFLICT DO NOTHING;

-- OS Diagnosis for existing corrective OS
INSERT INTO public.os_diagnosis (work_order_id, symptom, failure, cause, action, system, component)
SELECT wo.id, 'Vazamento de óleo visível', 'Vazamento no cárter', 'Desgaste da junta', 'Substituição da junta do cárter', 'Motor', 'Cárter'
FROM public.work_orders wo WHERE wo.diagnosis = 'Vazamento de óleo no cárter'
ON CONFLICT DO NOTHING;
