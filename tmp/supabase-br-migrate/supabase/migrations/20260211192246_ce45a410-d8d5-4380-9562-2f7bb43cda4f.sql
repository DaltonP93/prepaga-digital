
-- Add billing/invoicing fields to the sales table
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS billing_razon_social text,
  ADD COLUMN IF NOT EXISTS billing_ruc text,
  ADD COLUMN IF NOT EXISTS billing_email text,
  ADD COLUMN IF NOT EXISTS billing_phone text;

-- Add comment for documentation
COMMENT ON COLUMN public.sales.billing_razon_social IS 'Razón social para facturación';
COMMENT ON COLUMN public.sales.billing_ruc IS 'RUC para facturación';
COMMENT ON COLUMN public.sales.billing_email IS 'Email para facturación';
COMMENT ON COLUMN public.sales.billing_phone IS 'Celular para facturación';
