
-- Add missing columns to company_settings for WhatsApp provider config
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS whatsapp_provider text NOT NULL DEFAULT 'wame_fallback',
  ADD COLUMN IF NOT EXISTS twilio_account_sid text NULL,
  ADD COLUMN IF NOT EXISTS twilio_auth_token text NULL,
  ADD COLUMN IF NOT EXISTS twilio_whatsapp_number text NULL;

-- Add smtp_relay_url to company_otp_policy for HTTP-based SMTP relay
ALTER TABLE public.company_otp_policy
  ADD COLUMN IF NOT EXISTS smtp_relay_url text NULL;
