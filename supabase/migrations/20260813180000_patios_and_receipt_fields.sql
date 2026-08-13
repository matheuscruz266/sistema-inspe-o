-- ============================================================
-- 1) Tabela de Pátios (cadastro)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.patios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  contact TEXT,
  phone TEXT,
  notes TEXT,
  stock_location_id UUID REFERENCES public.stock_locations(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS para patios
ALTER TABLE public.patios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_patios" ON public.patios;
CREATE POLICY "auth_select_patios" ON public.patios
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_patios" ON public.patios;
CREATE POLICY "auth_insert_patios" ON public.patios
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_patios" ON public.patios;
CREATE POLICY "auth_update_patios" ON public.patios
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_patios" ON public.patios;
CREATE POLICY "auth_delete_patios" ON public.patios
  FOR DELETE TO authenticated USING (true);

-- ============================================================
-- 2) Novos campos de recebimento (valores)
-- ============================================================
ALTER TABLE public.log_receipts
  ADD COLUMN IF NOT EXISTS patio_id UUID REFERENCES public.patios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS valor_ton_madeira NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_madeira NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_ton_frete NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_frete NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS outros_ton NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_outros NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_total_carga NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS m3_estereo NUMERIC DEFAULT 0;
