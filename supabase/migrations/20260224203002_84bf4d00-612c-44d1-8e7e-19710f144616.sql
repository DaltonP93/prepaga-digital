
-- 1. Remove duplicate trigger on sales table
DROP TRIGGER IF EXISTS trg_check_vendedor_edit ON public.sales;

-- 2. Fix update_updated_at_column to include search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

-- 3. Fix update_workflow_config_updated_at to include search_path
CREATE OR REPLACE FUNCTION public.update_workflow_config_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
