-- Add immediate_coverage and sale_type to sales table
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS immediate_coverage boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sale_type character varying DEFAULT 'venta_nueva';

-- Add barrio to beneficiaries (was missing)
ALTER TABLE public.beneficiaries
  ADD COLUMN IF NOT EXISTS barrio character varying DEFAULT NULL;