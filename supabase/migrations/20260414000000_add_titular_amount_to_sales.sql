-- Add titular_amount to sales to store the base plan price for the titular
-- independently from the grand total (which includes adherentes)
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS titular_amount numeric(12,2);

-- Populate from primary beneficiary where it exists
UPDATE public.sales s
SET titular_amount = (
  SELECT b.amount FROM beneficiaries b
  WHERE b.sale_id = s.id AND b.is_primary = true LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM beneficiaries b WHERE b.sale_id = s.id AND b.is_primary = true
);

-- For sales WITHOUT primary beneficiary, infer titular_amount = total_amount - adherentes sum
UPDATE public.sales s
SET titular_amount = s.total_amount - COALESCE((
  SELECT SUM(b.amount) FROM beneficiaries b
  WHERE b.sale_id = s.id AND b.is_primary = false
), 0)
WHERE titular_amount IS NULL AND EXISTS (
  SELECT 1 FROM beneficiaries b WHERE b.sale_id = s.id
);

-- For sales with NO beneficiaries at all, use total_amount as base
UPDATE public.sales s
SET titular_amount = s.total_amount
WHERE titular_amount IS NULL;
