
CREATE OR REPLACE FUNCTION public.auto_advance_sale_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'completado' AND OLD.status != 'completado' THEN
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
