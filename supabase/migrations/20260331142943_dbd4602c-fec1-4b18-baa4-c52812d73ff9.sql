
-- Fix: Restrict signature_identity_verification SELECT to admins, auditors, supervisors, or the sale's salesperson
DROP POLICY IF EXISTS "Authenticated users can view identity verifications" ON public.signature_identity_verification;

CREATE POLICY "Restricted view of identity verifications"
ON public.signature_identity_verification
FOR SELECT
TO authenticated
USING (
  sale_id IN (
    SELECT s.id FROM public.sales s
    WHERE s.company_id = public.get_user_company_id(auth.uid())
    AND (
      public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'auditor'::app_role)
      OR public.has_role(auth.uid(), 'supervisor'::app_role)
      OR s.salesperson_id = auth.uid()
    )
  )
);
