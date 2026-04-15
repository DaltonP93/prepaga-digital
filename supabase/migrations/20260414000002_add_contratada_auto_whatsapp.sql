-- Add toggle for auto-sending WhatsApp to contratada when all step-1 signers complete
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS contratada_auto_whatsapp boolean DEFAULT true;
