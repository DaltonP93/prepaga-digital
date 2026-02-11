
-- Add contract_start_date column to sales
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS contract_start_date date;

-- Add comment
COMMENT ON COLUMN public.sales.contract_start_date IS 'Auto-calculated: first day of the month when sale is approved';
