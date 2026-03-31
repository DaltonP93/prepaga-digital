-- Fix check_all_signatures_completed to exclude revoked links
CREATE OR REPLACE FUNCTION public.check_all_signatures_completed(p_sale_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total_links INTEGER;
  completed_links INTEGER;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completado')
  INTO total_links, completed_links
  FROM public.signature_links
  WHERE sale_id = p_sale_id
    AND status != 'revocado';
  
  IF total_links = 0 THEN
    RETURN false;
  END IF;
  
  RETURN total_links = completed_links;
END;
$function$;

-- Ensure trigger exists on signature_links
DROP TRIGGER IF EXISTS trg_auto_advance_sale_status ON public.signature_links;
CREATE TRIGGER trg_auto_advance_sale_status
  AFTER UPDATE ON public.signature_links
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_advance_sale_status();

-- Fix stuck sales: all_signatures_completed=true but status not completado
UPDATE public.sales
SET status = 'completado'
WHERE all_signatures_completed = true AND status != 'completado';

-- Fix sale 2026-000044: all non-revoked links are completed
UPDATE public.sales
SET all_signatures_completed = true,
    signature_completed_at = NOW(),
    status = 'completado'
WHERE id = '5ff181d5-f45c-4122-a8c4-4a7e11393fe4';