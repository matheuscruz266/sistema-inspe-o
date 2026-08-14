-- ============================================================
-- Filter inactive (is_active = false) products out of current_stock view.
-- Dashboards (StockDashboard, DashYards, Index) and stock lookups
-- (StockInventoryDialog) read from this view and should only see
-- active, non-deleted products.
-- ============================================================

CREATE OR REPLACE VIEW public.current_stock
WITH (security_invoker = true) AS
SELECT
  p.id, p.name, p.code, p.category, p.unit, p.min_quantity, p.unit_value, p.supplier,
  COALESCE(SUM(CASE WHEN sm.movement_type IN ('entrada', 'retorno') THEN sm.quantity ELSE -sm.quantity END), 0) AS current_balance
FROM public.products p
LEFT JOIN public.stock_movements sm ON sm.product_id = p.id AND COALESCE(sm.is_deleted, false) = false
WHERE COALESCE(p.is_deleted, false) = false
  AND COALESCE(p.is_active, true) = true
GROUP BY p.id, p.name, p.code, p.category, p.unit, p.min_quantity, p.unit_value, p.supplier;

-- Ensure grant is still present (idempotent).
GRANT SELECT ON public.current_stock TO authenticated;
