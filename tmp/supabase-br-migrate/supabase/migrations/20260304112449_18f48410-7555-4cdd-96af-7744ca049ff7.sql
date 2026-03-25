-- Add contratada signature configuration to company_settings
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS contratada_signature_mode text NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS contratada_signer_name text,
  ADD COLUMN IF NOT EXISTS contratada_signer_email text,
  ADD COLUMN IF NOT EXISTS contratada_signer_dni text;

-- contratada_signature_mode: 'auto' = auto-fill with company data, 'link' = send signature link to configured email
COMMENT ON COLUMN public.company_settings.contratada_signature_mode IS 'auto: firma automática con datos empresa, link: enviar link al representante';
COMMENT ON COLUMN public.company_settings.contratada_signer_name IS 'Nombre del representante legal para firma';
COMMENT ON COLUMN public.company_settings.contratada_signer_email IS 'Email del representante para envío de link de firma';
COMMENT ON COLUMN public.company_settings.contratada_signer_dni IS 'C.I./RUC del representante legal';