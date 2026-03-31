-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Company users can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Public signature access to documents" ON storage.objects;

-- Replace with tenant-scoped policy: authenticated users can only read files 
-- whose path starts with their company_id
CREATE POLICY "Tenant-scoped document access"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    -- Company-scoped paths: {company_id}/...
    (storage.foldername(name))[1] = (public.get_user_company_id(auth.uid()))::text
    -- contracts/ paths: validate company ownership through documents/sales join
    OR (
      (storage.foldername(name))[1] = 'contracts'
      AND EXISTS (
        SELECT 1 FROM public.documents d
        JOIN public.sales s ON s.id = d.sale_id
        WHERE d.id::text = (storage.foldername(name))[3]
        AND s.company_id = public.get_user_company_id(auth.uid())
      )
    )
  )
);