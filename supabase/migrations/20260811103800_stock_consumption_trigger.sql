-- Auto stock consumption when OS material is inserted
CREATE OR REPLACE FUNCTION public.auto_stock_on_os_material()
RETURNS trigger AS $$
BEGIN
  IF NEW.product_id IS NOT NULL AND NEW.quantity > 0 THEN
    INSERT INTO public.stock_movements (product_id, movement_type, quantity, unit_value, reason, reference)
    VALUES (NEW.product_id, 'saida', NEW.quantity, COALESCE(NEW.unit_cost, 0), 'Consumo OS - Material', NEW.work_order_id::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS os_materials_stock_trigger ON public.os_materials;
CREATE TRIGGER os_materials_stock_trigger
  AFTER INSERT ON public.os_materials
  FOR EACH ROW EXECUTE FUNCTION public.auto_stock_on_os_material();

-- Restore stock when OS material is deleted
CREATE OR REPLACE FUNCTION public.restore_stock_on_os_material_delete()
RETURNS trigger AS $$
BEGIN
  IF OLD.product_id IS NOT NULL AND OLD.quantity > 0 THEN
    INSERT INTO public.stock_movements (product_id, movement_type, quantity, unit_value, reason, reference)
    VALUES (OLD.product_id, 'entrada', OLD.quantity, COALESCE(OLD.unit_cost, 0), 'Estorno OS - Material removido', OLD.work_order_id::text);
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS os_materials_stock_delete_trigger ON public.os_materials;
CREATE TRIGGER os_materials_stock_delete_trigger
  AFTER DELETE ON public.os_materials
  FOR EACH ROW EXECUTE FUNCTION public.restore_stock_on_os_material_delete();

-- Add code column to work_orders for OS numbering
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS code TEXT;
