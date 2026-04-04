DO $$
BEGIN
  -- Tenants upload issue photos
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Tenants upload issue photos' AND tablename = 'objects') THEN
    CREATE POLICY "Tenants upload issue photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'issue-photos' AND auth.uid() IS NOT NULL);
  END IF;

  -- Admins manage issue photos
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage issue photos' AND tablename = 'objects') THEN
    CREATE POLICY "Admins manage issue photos" ON storage.objects FOR DELETE USING (bucket_id = 'issue-photos' AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
  END IF;

  -- Admins upload documents
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins upload documents' AND tablename = 'objects') THEN
    CREATE POLICY "Admins upload documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents' AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
  END IF;

  -- Admins delete documents
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins delete documents' AND tablename = 'objects') THEN
    CREATE POLICY "Admins delete documents" ON storage.objects FOR DELETE USING (bucket_id = 'documents' AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
  END IF;

  -- Auth users download documents
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth users download documents' AND tablename = 'objects') THEN
    CREATE POLICY "Auth users download documents" ON storage.objects FOR SELECT USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);
  END IF;
END;
$$;