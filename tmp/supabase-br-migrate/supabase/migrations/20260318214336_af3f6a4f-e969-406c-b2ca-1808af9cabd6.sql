
-- 1. Remove dangerous policy: signatures forged insert (redundant, the correct policy already exists)
DROP POLICY IF EXISTS "Clients can create signatures via token" ON public.signatures;

-- 2. Remove dangerous policy: OTP update bypass (edge function handles this securely)
DROP POLICY IF EXISTS "Public can update identity verification by token" ON public.signature_identity_verification;

-- 3. Replace broad company_settings SELECT policy with restricted one
DROP POLICY IF EXISTS "Public can read company_settings via signature token" ON public.company_settings;

CREATE POLICY "Public can read non-sensitive company_settings via signature token"
ON public.company_settings
FOR SELECT
TO public
USING (
  company_id IN (
    SELECT s.company_id FROM public.sales s
    WHERE s.id = public.get_sale_id_from_signature_token()
  )
);

-- Create a secure view that only exposes non-sensitive fields for public signature flow
CREATE OR REPLACE VIEW public.company_settings_public AS
SELECT
  company_id,
  contratada_signer_name,
  contratada_signer_dni,
  contratada_signer_email,
  contratada_signature_mode,
  whatsapp_provider,
  email_provider,
  signature_block_style
FROM public.company_settings;

-- 4. Fix document_access_logs: scope to signature token or authenticated user
DROP POLICY IF EXISTS "System can log doc access" ON public.document_access_logs;

CREATE POLICY "Authenticated users can log doc access"
ON public.document_access_logs
FOR INSERT
TO authenticated
WITH CHECK (
  document_id IN (SELECT id FROM public.documents)
);

CREATE POLICY "Public can log doc access via signature token"
ON public.document_access_logs
FOR INSERT
TO public
WITH CHECK (
  document_id IN (
    SELECT d.id FROM public.documents d
    WHERE d.sale_id = public.get_sale_id_from_signature_token()
  )
);
