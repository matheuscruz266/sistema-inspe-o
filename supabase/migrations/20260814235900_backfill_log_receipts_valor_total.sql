-- Backfill valor_total_carga (and related fields) on log_receipts rows that
-- were created before the payload started sending those fields.
-- All existing rows have valor_total_carga = 0; this estimates default values
-- based on quantity (R$ 100/ton madeira + R$ 15/ton frete = R$ 115/ton).
-- Idempotent: only touches rows where valor_total_carga IS NULL OR = 0 and
-- quantity > 0 and status != 'Cancelado'.
DO $$
DECLARE
  batch_size INT := 500;
  affected INT;
BEGIN
  LOOP
    UPDATE public.log_receipts
    SET
      valor_ton_madeira = 100,
      total_madeira = COALESCE(quantity, 0) * 100,
      valor_ton_frete = 15,
      total_frete = COALESCE(quantity, 0) * 15,
      valor_total_carga = COALESCE(quantity, 0) * 115
    WHERE id IN (
      SELECT id
      FROM public.log_receipts
      WHERE (valor_total_carga IS NULL OR valor_total_carga = 0)
        AND COALESCE(quantity, 0) > 0
        AND COALESCE(status, '') <> 'Cancelado'
      LIMIT batch_size
    );
    GET DIAGNOSTICS affected = ROW_COUNT;
    EXIT WHEN affected = 0;
    PERFORM pg_sleep(0.05);
  END LOOP;
END $$;
