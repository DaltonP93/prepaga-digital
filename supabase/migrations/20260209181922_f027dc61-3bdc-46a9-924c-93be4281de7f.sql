-- Add signer_type and signer fields to sales table
ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS signer_type varchar DEFAULT 'titular',
  ADD COLUMN IF NOT EXISTS signer_name varchar,
  ADD COLUMN IF NOT EXISTS signer_dni varchar,
  ADD COLUMN IF NOT EXISTS signer_relationship varchar;