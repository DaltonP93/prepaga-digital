-- Add signer email and phone for responsable de pago
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS signer_email text,
  ADD COLUMN IF NOT EXISTS signer_phone text;
