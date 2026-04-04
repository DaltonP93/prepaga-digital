CREATE OR REPLACE FUNCTION public.admin_change_sale_status(p_sale_id uuid, p_new_status text, p_new_audit_status text DEFAULT NULL::text, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_role text;
  v_old_status text;
  v_old_audit_status text;
BEGIN
  -- admin, super_admin, auditor, supervisor pueden usar esta función
  SELECT role INTO v_role FROM user_roles 
  WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'auditor', 'supervisor')
  LIMIT 1;

  IF v_role IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin permisos para cambiar el estado de ventas');
  END IF;

  -- Obtener estado actual
  SELECT status::text, audit_status INTO v_old_status, v_old_audit_status
  FROM sales WHERE id = p_sale_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Venta no encontrada');
  END IF;

  -- Aplicar cambio
  UPDATE sales SET
    status = COALESCE(p_new_status::sale_status, status),
    audit_status = COALESCE(p_new_audit_status, audit_status),
    audit_notes = CASE WHEN p_reason IS NOT NULL THEN p_reason ELSE audit_notes END,
    updated_at = now()
  WHERE id = p_sale_id;

  -- Log en audit_logs
  INSERT INTO audit_logs (user_id, company_id, action, entity_type, entity_id, old_values, new_values, created_at)
  SELECT auth.uid(), company_id, 'ADMIN_STATUS_CHANGE', 'sales', p_sale_id,
    jsonb_build_object('status', v_old_status, 'audit_status', v_old_audit_status),
    jsonb_build_object('status', p_new_status, 'audit_status', p_new_audit_status, 'reason', p_reason),
    now()
  FROM sales WHERE id = p_sale_id;

  RETURN jsonb_build_object('ok', true, 'old_status', v_old_status, 'new_status', p_new_status);
END;
$function$;