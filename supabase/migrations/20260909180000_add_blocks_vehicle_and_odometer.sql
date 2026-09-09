-- Add blocks_vehicle to non_conformities if not exists
ALTER TABLE public.non_conformities ADD COLUMN IF NOT EXISTS blocks_vehicle boolean DEFAULT false;

-- Add odometer to inspections if not exists
ALTER TABLE public.inspections ADD COLUMN IF NOT EXISTS odometer numeric DEFAULT NULL;

-- Update existing non_conformities based on classification if critical
UPDATE public.non_conformities
SET blocks_vehicle = true
WHERE classification ILIKE '%crítico%' OR classification ILIKE '%critico%' OR criticality = 'Crítica';
