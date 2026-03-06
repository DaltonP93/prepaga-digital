
DROP POLICY IF EXISTS "Service role can insert certificates" ON public.legal_evidence_certificates;

CREATE POLICY "Admins can insert certificates"
ON public.legal_evidence_certificates
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('super_admin', 'admin')
  )
);
