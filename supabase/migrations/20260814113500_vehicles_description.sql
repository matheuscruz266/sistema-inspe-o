-- Add "Descrição do Equipamento" column to vehicles
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS description TEXT;
