
CREATE OR REPLACE FUNCTION public.check_vendedor_edit_restriction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'vendedor'
  ) AND NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'supervisor', 'auditor', 'gestor','vendedor')
  ) THEN
    IF OLD.status != 'borrador' THEN
      RAISE EXCEPTION 'Vendedor solo puede editar ventas en estado borrador. Estado actual: %', OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
