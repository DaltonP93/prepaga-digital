
-- Fix: Restrict document_access_logs INSERT to same-company documents only
DROP POLICY IF EXISTS "Authenticated users can log doc access" ON public.document_access_logs;

CREATE POLICY "Authenticated users can log doc access"
ON public.document_access_logs
FOR INSERT
TO authenticated
WITH CHECK (
  document_id IN (
    SELECT d.id
    FROM public.documents d
    JOIN public.sales s ON s.id = d.sale_id
    WHERE s.company_id = public.get_user_company_id(auth.uid())
  )
);
