-- ============================================================
-- Logistics Phase 6: Fiscal Documents (NF-e & CT-e)
-- Idempotent migration for sales invoices and freight documents
-- ============================================================

-- 1. Create sales_invoices table (NF-e)
CREATE TABLE IF NOT EXISTS public.sales_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  series TEXT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  unit TEXT DEFAULT 'TON',
  net_weight NUMERIC(10,3),
  gross_weight NUMERIC(10,3),
  unit_value NUMERIC(10,2),
  total_value NUMERIC(10,2),
  status TEXT DEFAULT 'Emitida',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false
);

-- 2. Create freight_documents table (CT-e)
CREATE TABLE IF NOT EXISTS public.freight_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  carrier_supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL,
  cte_number TEXT NOT NULL,
  series TEXT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  freight_value NUMERIC(10,2),
  status TEXT DEFAULT 'Emitido',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false
);

-- 3. Enable RLS on new tables
ALTER TABLE public.sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freight_documents ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for sales_invoices (idempotent)
DROP POLICY IF EXISTS "auth_select_sales_invoices" ON public.sales_invoices;
CREATE POLICY "auth_select_sales_invoices" ON public.sales_invoices
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_sales_invoices" ON public.sales_invoices;
CREATE POLICY "auth_insert_sales_invoices" ON public.sales_invoices
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_sales_invoices" ON public.sales_invoices;
CREATE POLICY "auth_update_sales_invoices" ON public.sales_invoices
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_sales_invoices" ON public.sales_invoices;
CREATE POLICY "auth_delete_sales_invoices" ON public.sales_invoices
  FOR DELETE TO authenticated USING (true);

-- 5. Create RLS policies for freight_documents (idempotent)
DROP POLICY IF EXISTS "auth_select_freight_documents" ON public.freight_documents;
CREATE POLICY "auth_select_freight_documents" ON public.freight_documents
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_freight_documents" ON public.freight_documents;
CREATE POLICY "auth_insert_freight_documents" ON public.freight_documents
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_freight_documents" ON public.freight_documents;
CREATE POLICY "auth_update_freight_documents" ON public.freight_documents
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_freight_documents" ON public.freight_documents;
CREATE POLICY "auth_delete_freight_documents" ON public.freight_documents
  FOR DELETE TO authenticated USING (true);
