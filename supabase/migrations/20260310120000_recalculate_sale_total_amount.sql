-- Trigger: auto-recalculate sales.total_amount on beneficiary changes
-- Formula: plan.price (titular) + SUM of adherent amounts

-- Function executed by the trigger
CREATE OR REPLACE FUNCTION recalculate_sale_total_amount()
RETURNS TRIGGER AS $$
DECLARE
  v_sale_id UUID;
  v_plan_price NUMERIC;
  v_adherent_total NUMERIC;
BEGIN
  -- Determine which sale_id to update
  IF TG_OP = 'DELETE' THEN
    v_sale_id := OLD.sale_id;
  ELSE
    v_sale_id := NEW.sale_id;
  END IF;

  -- Get the plan price for this sale
  SELECT COALESCE(p.price, 0)
  INTO v_plan_price
  FROM sales s
  LEFT JOIN plans p ON p.id = s.plan_id
  WHERE s.id = v_sale_id;

  -- Sum only adherent amounts (exclude titular/is_primary)
  SELECT COALESCE(SUM(b.amount), 0)
  INTO v_adherent_total
  FROM beneficiaries b
  WHERE b.sale_id = v_sale_id
    AND (b.relationship IS DISTINCT FROM 'titular')
    AND (b.is_primary IS NULL OR b.is_primary = false);

  -- Update the sale total
  UPDATE sales
  SET total_amount = v_plan_price + v_adherent_total
  WHERE id = v_sale_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS trg_recalculate_sale_total ON beneficiaries;

-- Create trigger for INSERT, UPDATE, DELETE
CREATE TRIGGER trg_recalculate_sale_total
  AFTER INSERT OR UPDATE OR DELETE ON beneficiaries
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_sale_total_amount();

-- Fix all existing sales now
UPDATE sales s
SET total_amount = (
  SELECT COALESCE(p.price, 0)
  FROM plans p WHERE p.id = s.plan_id
) + (
  SELECT COALESCE(SUM(b.amount), 0)
  FROM beneficiaries b
  WHERE b.sale_id = s.id
    AND (b.relationship IS DISTINCT FROM 'titular')
    AND (b.is_primary IS NULL OR b.is_primary = false)
)
WHERE s.plan_id IS NOT NULL;
