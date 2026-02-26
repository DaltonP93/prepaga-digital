
-- Add WhatsApp QR gateway fields and email provider to company_settings
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS whatsapp_gateway_url text,
  ADD COLUMN IF NOT EXISTS whatsapp_linked_phone text,
  ADD COLUMN IF NOT EXISTS email_provider text DEFAULT 'resend';
