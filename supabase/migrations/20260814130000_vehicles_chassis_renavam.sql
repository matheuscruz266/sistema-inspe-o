-- Adiciona colunas chassis e renavam na tabela vehicles (nullable, idempotente)
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS chassis TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS renavam TEXT;
