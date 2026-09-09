-- Padronização de status e limpeza de dados de teste de inspeções e ordens de serviço

-- 1. Normalizar status de inspeções existentes para valores canônicos ('OK', 'Atenção', 'NOK')
UPDATE public.inspections
SET status = 'OK'
WHERE status ILIKE 'ok';

UPDATE public.inspections
SET status = 'NOK'
WHERE status ILIKE 'nok';

UPDATE public.inspections
SET status = 'Atenção'
WHERE status IN ('AtenÃ§Ã£o', 'Atenção', 'atencao', 'Atencao');

-- Corrigir codificação de type em inspeções se houver
UPDATE public.inspections
SET type = 'Diária'
WHERE type ILIKE 'di%ria' OR type = 'DiÃ¡ria';

-- 2. Corrigir o tipo da inspeção #23 para a periodicidade do plano vinculado (PLANO-SR-15, "15 dias")
UPDATE public.inspections
SET type = '15 dias'
WHERE inspection_number = 23;

-- 3. Limpar/marcar como deletadas as não conformidades de teste da inspeção #17 (itens "add" e "adw")
UPDATE public.non_conformities
SET is_deleted = true
WHERE inspection_id IN (
  SELECT id FROM public.inspections WHERE inspection_number = 17
)
AND (result_value IN ('add', 'adw') OR classification IN ('add', 'adw'));

-- 4. Corrigir o status da O.S. #19 que está "O.S Motorista" para o status canônico correspondente ("Aberta")
UPDATE public.work_orders
SET status = 'Aberta'
WHERE work_order_number = 19 AND status = 'O.S Motorista';

-- Corrigir eventuais variações de encoding no status de work_orders
UPDATE public.work_orders
SET status = 'Concluída'
WHERE status = 'ConcluÃ­da';
