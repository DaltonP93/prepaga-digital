
-- Fix security definer view - recreate with security_invoker
DROP VIEW IF EXISTS public.company_settings_public;

CREATE VIEW public.company_settings_public
WITH (security_invoker = true)
AS
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
