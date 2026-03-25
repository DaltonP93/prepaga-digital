-- Fix the auto_advance function: should trigger when a signature_link is marked completado
CREATE OR REPLACE FUNCTION public.auto_advance_sale_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- When a signature link is marked as completado
  IF NEW.status = 'completado' AND (OLD.status IS NULL OR OLD.status != 'completado') THEN
    -- Check if ALL signature links for this sale are now completed
    IF public.check_all_signatures_completed(NEW.sale_id) THEN
      UPDATE public.sales
      SET 
        all_signatures_completed = true,
        signature_completed_at = NOW(),
        status = 'completado'
      WHERE id = NEW.sale_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create the trigger on signature_links table
DROP TRIGGER IF EXISTS trg_auto_advance_sale_status ON public.signature_links;
CREATE TRIGGER trg_auto_advance_sale_status
  AFTER UPDATE ON public.signature_links
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_advance_sale_status();