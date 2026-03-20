-- ====================================================================
-- FIX 1: Replace company_settings_public VIEW to exclude PII columns
-- ====================================================================
DROP VIEW IF EXISTS public.company_settings_public;
CREATE VIEW public.company_settings_public
WITH (security_invoker = true)
AS
SELECT
  company_id,
  contratada_signer_name,
  contratada_signature_mode,
  signature_block_style
FROM public.company_settings;

-- ====================================================================
-- FIX 2: Replace OTP policy that leaks SMTP credentials
-- Drop the overly permissive public SELECT policy
-- ====================================================================
DROP POLICY IF EXISTS "Public can read OTP policy by signature token" ON public.company_otp_policy;

-- Create a restricted policy that only exposes non-sensitive OTP config fields
-- We use a security definer function to safely filter columns
CREATE OR REPLACE FUNCTION public.get_otp_policy_for_signature(p_company_id uuid)
RETURNS TABLE(
  otp_length int,
  otp_expiration_seconds int,
  max_attempts int,
  allowed_channels jsonb,
  default_channel text,
  require_otp_for_signature boolean,
  whatsapp_otp_enabled boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    otp_length,
    otp_expiration_seconds,
    max_attempts,
    allowed_channels::jsonb,
    default_channel,
    require_otp_for_signature,
    whatsapp_otp_enabled
  FROM public.company_otp_policy
  WHERE company_id = p_company_id
  LIMIT 1;
$$;

-- ====================================================================
-- FIX 3: Fix mutable function search paths
-- ====================================================================
ALTER FUNCTION public.update_incident_updated_at() SET search_path = public;
ALTER FUNCTION public.recalculate_sale_total_amount() SET search_path = public;
ALTER FUNCTION public.set_titular_amount_on_save() SET search_path = public;