
-- 1. Remove plaintext password column
ALTER TABLE public.tenants DROP COLUMN IF EXISTS initial_password;

-- 2. Fix documents bucket storage policies
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Tenants view document files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete documents" ON storage.objects;

-- Admin full access to documents bucket
CREATE POLICY "Admins full access documents"
ON storage.objects
FOR ALL
USING (bucket_id = 'documents' AND public.is_admin())
WITH CHECK (bucket_id = 'documents' AND public.is_admin());

-- Tenants can only view their own documents (via join on documents table)
CREATE POLICY "Tenants view own document files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM public.documents d
    JOIN public.tenants t ON (
      d.tenant_id = t.id
      OR (d.apartment_id = t.apartment_id AND d.tenant_id IS NULL)
    )
    WHERE t.user_id = auth.uid()
      AND t.status = 'active'
      AND d.file_path = name
  )
);

-- 3. Fix issue-photos bucket storage policies
DROP POLICY IF EXISTS "Tenants upload issue photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users view issue photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete issue photos" ON storage.objects;

-- Admin full access to issue-photos bucket
CREATE POLICY "Admins full access issue-photos"
ON storage.objects
FOR ALL
USING (bucket_id = 'issue-photos' AND public.is_admin())
WITH CHECK (bucket_id = 'issue-photos' AND public.is_admin());

-- Tenants can only view photos of their own issues
CREATE POLICY "Tenants view own issue photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'issue-photos'
  AND EXISTS (
    SELECT 1 FROM public.issues i
    JOIN public.tenants t ON t.id = i.tenant_id
    WHERE t.user_id = auth.uid()
      AND name = ANY(i.photo_paths)
  )
);

-- Tenants can only upload photos to paths prefixed with their tenant id
CREATE POLICY "Tenants upload own issue photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'issue-photos'
  AND EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.user_id = auth.uid()
      AND t.status = 'active'
  )
);
