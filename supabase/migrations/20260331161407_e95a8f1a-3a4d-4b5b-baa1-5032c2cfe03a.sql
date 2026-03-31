-- ============================================================
-- SECURITY HARDENING - Full System Scan Fixes
-- ============================================================

-- ============================================================
-- FIX 1: OTP Hash Protection (signature_identity_verification)
-- Restrict anon access to exclude otp_code_hash
-- ============================================================
REVOKE ALL ON public.signature_identity_verification FROM anon;

GRANT SELECT (
  id, signature_link_id, sale_id, auth_method, destination_masked,
  expires_at, verified_at, attempts, max_attempts, result, created_at, channel
) ON public.signature_identity_verification TO anon;

GRANT INSERT (
  signature_link_id, sale_id, auth_method, destination_masked,
  otp_code_hash, expires_at, max_attempts, ip_address, user_agent, channel
) ON public.signature_identity_verification TO anon;

-- Recreate the anon SELECT policy
DROP POLICY IF EXISTS "Public can view own identity verification by token" ON public.signature_identity_verification;
CREATE POLICY "Public can view own identity verification by token"
ON public.signature_identity_verification
FOR SELECT
TO anon
USING (sale_id = public.get_sale_id_from_signature_token());

-- Recreate the anon INSERT policy scoped to anon role
DROP POLICY IF EXISTS "Public can insert identity verification by token" ON public.signature_identity_verification;
CREATE POLICY "Public can insert identity verification by token"
ON public.signature_identity_verification
FOR INSERT
TO anon
WITH CHECK (sale_id = public.get_sale_id_from_signature_token());

-- ============================================================
-- FIX 2: Auth Attempts Cross-Company Isolation
-- ============================================================
ALTER TABLE public.auth_attempts
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

CREATE INDEX IF NOT EXISTS idx_auth_attempts_company_id ON public.auth_attempts(company_id);

DROP POLICY IF EXISTS "Admins can view auth attempts" ON public.auth_attempts;
CREATE POLICY "Admins can view company auth attempts"
ON public.auth_attempts
FOR SELECT
TO authenticated
USING (
  (
    company_id = public.get_user_company_id(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'supervisor'::app_role)
    )
  )
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- ============================================================
-- FIX 3: Templates Cross-Company Isolation
-- ============================================================
DROP POLICY IF EXISTS "Gestors can manage templates" ON public.templates;
CREATE POLICY "Gestors can manage company templates"
ON public.templates
FOR ALL
TO authenticated
USING (
  (company_id = public.get_user_company_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gestor'::app_role)
  ))
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  (company_id = public.get_user_company_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gestor'::app_role)
  ))
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

DROP POLICY IF EXISTS "Users can view company templates" ON public.templates;
CREATE POLICY "Users can view company templates"
ON public.templates
FOR SELECT
TO authenticated
USING (
  company_id = public.get_user_company_id(auth.uid())
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- ============================================================
-- FIX 4: Remove Public Document DELETE
-- ============================================================
DROP POLICY IF EXISTS "Public can delete documents by signature token" ON public.documents;

-- ============================================================
-- FIX 5: company_otp_policy - Change from {public} to {authenticated}
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage OTP policy" ON public.company_otp_policy;
CREATE POLICY "Admins can manage OTP policy"
ON public.company_otp_policy
FOR ALL
TO authenticated
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
)
WITH CHECK (
  company_id = public.get_user_company_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- ============================================================
-- FIX 6: password_reset_tokens - Change from {public} to {authenticated}
-- ============================================================
DROP POLICY IF EXISTS "Users can manage own reset tokens" ON public.password_reset_tokens;
CREATE POLICY "Users can manage own reset tokens"
ON public.password_reset_tokens
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================
-- FIX 7: Communication Logs - Remove broad policies
-- ============================================================
DROP POLICY IF EXISTS "Users can view communication logs" ON public.communication_logs;
DROP POLICY IF EXISTS "Users can create communication logs" ON public.communication_logs;

DROP POLICY IF EXISTS "Admins can view communication logs" ON public.communication_logs;
CREATE POLICY "Admins can view communication logs"
ON public.communication_logs
FOR SELECT
TO authenticated
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'supervisor'::app_role)
  )
);

-- ============================================================
-- FIX 8: Beneficiary Documents - Add supervisor and auditor roles
-- ============================================================
DROP POLICY IF EXISTS "Users can view beneficiary documents" ON public.beneficiary_documents;
CREATE POLICY "Users can view beneficiary documents"
ON public.beneficiary_documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.beneficiaries b
    JOIN public.sales s ON s.id = b.sale_id
    WHERE b.id = beneficiary_documents.beneficiary_id
    AND (
      s.salesperson_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.has_role(auth.uid(), 'supervisor'::app_role)
      OR public.has_role(auth.uid(), 'auditor'::app_role)
    )
  )
);

DROP POLICY IF EXISTS "Users can manage beneficiary documents" ON public.beneficiary_documents;
CREATE POLICY "Users can manage beneficiary documents"
ON public.beneficiary_documents
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.beneficiaries b
    JOIN public.sales s ON s.id = b.sale_id
    WHERE b.id = beneficiary_documents.beneficiary_id
    AND (
      s.salesperson_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.has_role(auth.uid(), 'supervisor'::app_role)
      OR public.has_role(auth.uid(), 'auditor'::app_role)
    )
  )
);

-- ============================================================
-- FIX 9: Incidents - Remove NULL company_id condition
-- ============================================================
DROP POLICY IF EXISTS "incidents_select" ON public.incidents;
CREATE POLICY "incidents_select"
ON public.incidents
FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()));

-- ============================================================
-- FIX 10: Documents - Fix remaining {public} role policies to {authenticated}
-- ============================================================
DROP POLICY IF EXISTS "Users can manage sale documents" ON public.documents;
CREATE POLICY "Users can manage sale documents"
ON public.documents
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR sale_id IN (
    SELECT s.id FROM public.sales s
    WHERE s.salesperson_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can view sale documents" ON public.documents;
CREATE POLICY "Users can view sale documents"
ON public.documents
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR sale_id IN (
    SELECT s.id FROM public.sales s
    WHERE s.company_id = public.get_user_company_id(auth.uid())
  )
);