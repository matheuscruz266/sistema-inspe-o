-- ============================================================
-- Phase 7: Reports - Monthly Stock Summary & Trip Margin Views
-- Idempotent migration for logistics reporting
-- ============================================================

-- 1. Monthly Stock Summary View
CREATE OR REPLACE VIEW public.monthly_stock_summary
WITH (security_invoker = true) AS
WITH monthly_totals AS (
  SELECT
    sm.product_id,
    p.name AS product_name,
    p.code AS product_code,
    p.unit AS product_unit,
    sm.location_id,
    sl.name AS location_name,
    DATE_TRUNC('month', sm.created_at)::date AS month_date,
    SUM(CASE WHEN sm.movement_type IN ('entrada', 'retorno') THEN sm.quantity ELSE 0 END) AS quantity_in,
    SUM(CASE WHEN sm.movement_type NOT IN ('entrada', 'retorno') THEN sm.quantity ELSE 0 END) AS quantity_out
  FROM public.stock_movements sm
  JOIN public.products p ON p.id = sm.product_id
  LEFT JOIN public.stock_locations sl ON sl.id = sm.location_id
  WHERE COALESCE(sm.is_deleted, false) = false
  GROUP BY sm.product_id, p.name, p.code, p.unit, sm.location_id, sl.name, DATE_TRUNC('month', sm.created_at)
)
SELECT
  product_id,
  product_name,
  product_code,
  product_unit,
  location_id,
  location_name,
  month_date,
  quantity_in,
  quantity_out,
  COALESCE(
    SUM(quantity_in - quantity_out) OVER (
      PARTITION BY product_id, location_id
      ORDER BY month_date
      ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
    ), 0
  ) AS opening_balance,
  SUM(quantity_in - quantity_out) OVER (
    PARTITION BY product_id, location_id
    ORDER BY month_date
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS closing_balance
FROM monthly_totals;

GRANT SELECT ON public.monthly_stock_summary TO authenticated;

-- 2. Trip Margin Report View
CREATE OR REPLACE VIEW public.trip_margin_report
WITH (security_invoker = true) AS
SELECT
  t.id AS trip_id,
  t.trip_date,
  t.tractor_vehicle_id,
  v.plate AS tractor_plate,
  t.route_id,
  r.km_range AS route_label,
  t.destination_client_id,
  c.trade_name AS client_name,
  t.product_id,
  p.name AS product_name,
  t.net_weight,
  COALESCE(rev.revenue, 0) AS revenue,
  COALESCE(fc.freight_cost, 0) AS freight_cost,
  COALESCE(fuel.fuel_cost, 0) AS fuel_cost,
  COALESCE(fc.freight_cost, 0) + COALESCE(fuel.fuel_cost, 0) AS total_cost,
  COALESCE(rev.revenue, 0) - COALESCE(fc.freight_cost, 0) - COALESCE(fuel.fuel_cost, 0) AS margin
FROM public.trips t
LEFT JOIN public.vehicles v ON v.id = t.tractor_vehicle_id
LEFT JOIN public.routes r ON r.id = t.route_id
LEFT JOIN public.clients c ON c.id = t.destination_client_id
LEFT JOIN public.products p ON p.id = t.product_id
LEFT JOIN (
  SELECT trip_id, SUM(total_value) AS revenue
  FROM public.sales_invoices
  WHERE COALESCE(is_deleted, false) = false
  GROUP BY trip_id
) rev ON rev.trip_id = t.id
LEFT JOIN (
  SELECT trip_id, SUM(freight_value) AS freight_cost
  FROM public.freight_documents
  WHERE COALESCE(is_deleted, false) = false
  GROUP BY trip_id
) fc ON fc.trip_id = t.id
LEFT JOIN (
  SELECT vehicle_id, refuel_date, SUM(total_cost) AS fuel_cost
  FROM public.fuel_records
  WHERE COALESCE(is_deleted, false) = false
  GROUP BY vehicle_id, refuel_date
) fuel ON fuel.vehicle_id = t.tractor_vehicle_id AND fuel.refuel_date = t.trip_date
WHERE COALESCE(t.is_deleted, false) = false;

GRANT SELECT ON public.trip_margin_report TO authenticated;
