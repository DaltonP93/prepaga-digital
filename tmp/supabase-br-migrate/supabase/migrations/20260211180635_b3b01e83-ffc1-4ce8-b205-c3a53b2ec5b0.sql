-- Add 'rechazado' to the sale_status enum if not already present
ALTER TYPE public.sale_status ADD VALUE IF NOT EXISTS 'rechazado';