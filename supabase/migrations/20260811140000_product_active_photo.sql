-- Add is_active and photo_url columns to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Create product-photos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES
  ('product-photos', 'product-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for product-photos bucket
DO $$
BEGIN
  DROP POLICY IF EXISTS "auth_read_product_photos" ON storage.objects;
  CREATE POLICY "auth_read_product_photos" ON storage.objects
    FOR SELECT TO authenticated USING (bucket_id = 'product-photos');

  DROP POLICY IF EXISTS "auth_insert_product_photos" ON storage.objects;
  CREATE POLICY "auth_insert_product_photos" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-photos');

  DROP POLICY IF EXISTS "auth_update_product_photos" ON storage.objects;
  CREATE POLICY "auth_update_product_photos" ON storage.objects
    FOR UPDATE TO authenticated USING (bucket_id = 'product-photos');

  DROP POLICY IF EXISTS "auth_delete_product_photos" ON storage.objects;
  CREATE POLICY "auth_delete_product_photos" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'product-photos');
END $$;
