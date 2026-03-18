
-- Fix trigger: use sale.total_amount minus adherent sum instead of plan.price
CREATE OR REPLACE FUNCTION public.set_titular_amount_on_save()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_adherent_sum NUMERIC;
  v_sale_total NUMERIC;
BEGIN
  IF (NEW.is_primary = true OR LOWER(NEW.relationship) = 'titular') AND (NEW.amount IS NULL OR NEW.amount = 0) THEN
    -- Get sale total
    SELECT COALESCE(s.total_amount, COALESCE(p.price, 0))
    INTO v_sale_total
    FROM sales s
    LEFT JOIN plans p ON p.id = s.plan_id
    WHERE s.id = NEW.sale_id;

    -- Sum existing adherent amounts
    SELECT COALESCE(SUM(amount), 0)
    INTO v_adherent_sum
    FROM beneficiaries
    WHERE sale_id = NEW.sale_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND (is_primary = false OR is_primary IS NULL)
      AND LOWER(COALESCE(relationship, '')) != 'titular';

    NEW.amount := GREATEST(v_sale_total - v_adherent_sum, 0);
  END IF;
  RETURN NEW;
END;
$function$;
