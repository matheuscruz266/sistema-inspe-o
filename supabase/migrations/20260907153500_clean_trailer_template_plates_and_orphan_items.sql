-- Migration: Limpar placas placeholder dos planos de Carreta e limpar itens órfãos de planos deletados
-- 1. Atualizar planos de carreta com plate = '' para que sejam aplicáveis a todas as carretas
UPDATE public.inspection_plans
SET plate = ''
WHERE plate LIKE 'TEMPLATE-SR-%'
  AND COALESCE(is_deleted, false) = false;

-- 2. Limpar itens órfãos de inspection_plan_items cujos planos foram deletados (is_deleted = true) ou não existem
DELETE FROM public.inspection_plan_items
WHERE plan_id NOT IN (
  SELECT id FROM public.inspection_plans WHERE COALESCE(is_deleted, false) = false
);

-- 3. Limpar também consequências órfãs cujos planos foram deletados
DELETE FROM public.inspection_plan_consequences
WHERE plan_id NOT IN (
  SELECT id FROM public.inspection_plans WHERE COALESCE(is_deleted, false) = false
);
