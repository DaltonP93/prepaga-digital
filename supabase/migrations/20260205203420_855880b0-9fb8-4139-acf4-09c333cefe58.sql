-- Create storage bucket for documents (beneficiaries, sales, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- RLS Policies for documents bucket

-- Policy: Users can upload documents to their company folder
CREATE POLICY "Users can upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

-- Policy: Users can view documents from their company
CREATE POLICY "Users can view company documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

-- Policy: Users can update their company documents
CREATE POLICY "Users can update company documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

-- Policy: Admins can delete company documents
CREATE POLICY "Admins can delete company documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM public.profiles WHERE id = auth.uid()
  )
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);