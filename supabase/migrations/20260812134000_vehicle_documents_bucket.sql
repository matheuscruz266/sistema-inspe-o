INSERT INTO storage.buckets (id, name, public) VALUES
  ('vehicle-documents', 'vehicle-documents', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  DROP POLICY IF EXISTS "auth_read_vehicle_documents" ON storage.objects;
  CREATE POLICY "auth_read_vehicle_documents" ON storage.objects
    FOR SELECT TO authenticated USING (bucket_id = 'vehicle-documents');

  DROP POLICY IF EXISTS "auth_insert_vehicle_documents" ON storage.objects;
  CREATE POLICY "auth_insert_vehicle_documents" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'vehicle-documents');

  DROP POLICY IF EXISTS "auth_update_vehicle_documents" ON storage.objects;
  CREATE POLICY "auth_update_vehicle_documents" ON storage.objects
    FOR UPDATE TO authenticated USING (bucket_id = 'vehicle-documents');

  DROP POLICY IF EXISTS "auth_delete_vehicle_documents" ON storage.objects;
  CREATE POLICY "auth_delete_vehicle_documents" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'vehicle-documents');
END $$;
