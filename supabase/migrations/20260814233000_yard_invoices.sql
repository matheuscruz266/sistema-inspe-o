-- ============================================================
-- Faturas automáticas de pátios (yard_invoices + yard_invoice_items)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.yard_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  patio_id UUID REFERENCES public.patios(id) ON DELETE SET NULL,
  invoice_number TEXT,
  period_start DATE,
  period_end DATE,
  due_date DATE,
  -- modality: 'quinzenal_1' | 'quinzenal_2' | 'semanal'
  modality TEXT DEFAULT 'semanal',
  status TEXT DEFAULT 'Pendente',
  total NUMERIC DEFAULT 0,
  notes TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.yard_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_yard_invoices" ON public.yard_invoices;
CREATE POLICY "auth_select_yard_invoices" ON public.yard_invoices
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_yard_invoices" ON public.yard_invoices;
CREATE POLICY "auth_insert_yard_invoices" ON public.yard_invoices
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_yard_invoices" ON public.yard_invoices;
CREATE POLICY "auth_update_yard_invoices" ON public.yard_invoices
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_yard_invoices" ON public.yard_invoices;
CREATE POLICY "auth_delete_yard_invoices" ON public.yard_invoices
  FOR DELETE TO authenticated USING (true);

-- Itens da fatura (entregas vinculadas a recebimentos + itens manuais)
CREATE TABLE IF NOT EXISTS public.yard_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.yard_invoices(id) ON DELETE CASCADE,
  receipt_id UUID REFERENCES public.log_receipts(id) ON DELETE SET NULL,
  delivery_date DATE,
  nfe_number TEXT,
  weight_ton NUMERIC DEFAULT 0,
  wood_value NUMERIC DEFAULT 0,
  freight_value NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  -- itens manuais / adicionais
  is_manual BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  amount NUMERIC DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.yard_invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_yard_invoice_items" ON public.yard_invoice_items;
CREATE POLICY "auth_select_yard_invoice_items" ON public.yard_invoice_items
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_yard_invoice_items" ON public.yard_invoice_items;
CREATE POLICY "auth_insert_yard_invoice_items" ON public.yard_invoice_items
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_yard_invoice_items" ON public.yard_invoice_items;
CREATE POLICY "auth_update_yard_invoice_items" ON public.yard_invoice_items
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_yard_invoice_items" ON public.yard_invoice_items;
CREATE POLICY "auth_delete_yard_invoice_items" ON public.yard_invoice_items
  FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_yard_invoices_supplier_id ON public.yard_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_yard_invoices_patio_id ON public.yard_invoices(patio_id);
CREATE INDEX IF NOT EXISTS idx_yard_invoices_due_date ON public.yard_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_yard_invoices_status ON public.yard_invoices(status);
CREATE INDEX IF NOT EXISTS idx_yard_invoice_items_invoice_id ON public.yard_invoice_items(invoice_id);
