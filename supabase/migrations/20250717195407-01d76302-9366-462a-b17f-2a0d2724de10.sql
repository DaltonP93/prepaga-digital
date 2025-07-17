-- Actualizar todas las funciones existentes para agregar search_path = ''
-- Esto es una corrección de seguridad importante

-- Función get_user_company
CREATE OR REPLACE FUNCTION public.get_user_company(user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
    SELECT company_id FROM public.profiles WHERE id = user_id;
$function$;

-- Función get_user_role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
 RETURNS user_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
    SELECT role FROM public.profiles WHERE id = user_id;
$function$;

-- Función create_password_reset_token
CREATE OR REPLACE FUNCTION public.create_password_reset_token(user_email text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
    user_id_var UUID;
    token_var TEXT;
BEGIN
    -- Buscar el usuario por email
    SELECT id INTO user_id_var 
    FROM public.profiles 
    WHERE email = user_email;
    
    IF user_id_var IS NULL THEN
        RAISE EXCEPTION 'Usuario no encontrado';
    END IF;
    
    -- Generar token único
    token_var := encode(gen_random_bytes(32), 'base64');
    
    -- Invalidar tokens anteriores
    UPDATE public.password_reset_tokens 
    SET used_at = now() 
    WHERE user_id = user_id_var AND used_at IS NULL;
    
    -- Crear nuevo token (válido por 30 minutos en lugar de 1 hora)
    INSERT INTO public.password_reset_tokens (user_id, token, expires_at)
    VALUES (user_id_var, token_var, now() + INTERVAL '30 minutes');
    
    RETURN token_var;
END;
$function$;

-- Función validate_reset_token
CREATE OR REPLACE FUNCTION public.validate_reset_token(token_param text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
    user_id_var UUID;
BEGIN
    SELECT user_id INTO user_id_var
    FROM public.password_reset_tokens
    WHERE token = token_param 
    AND expires_at > now() 
    AND used_at IS NULL;
    
    IF user_id_var IS NULL THEN
        RAISE EXCEPTION 'Token inválido o expirado';
    END IF;
    
    -- Marcar token como usado
    UPDATE public.password_reset_tokens 
    SET used_at = now() 
    WHERE token = token_param;
    
    RETURN user_id_var;
END;
$function$;

-- Función create_user_profile
CREATE OR REPLACE FUNCTION public.create_user_profile(user_id uuid, user_email text, first_name text, last_name text, user_role user_role DEFAULT 'vendedor'::user_role, company_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
    profile_id UUID;
BEGIN
    INSERT INTO public.profiles (
        id, 
        email, 
        first_name, 
        last_name, 
        role, 
        company_id
    ) VALUES (
        user_id,
        user_email,
        first_name,
        last_name,
        user_role,
        company_id
    ) RETURNING id INTO profile_id;
    
    RETURN profile_id;
END;
$function$;

-- Función log_audit
CREATE OR REPLACE FUNCTION public.log_audit(p_table_name text, p_action text, p_record_id uuid DEFAULT NULL::uuid, p_old_values jsonb DEFAULT NULL::jsonb, p_new_values jsonb DEFAULT NULL::jsonb, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text, p_session_id text DEFAULT NULL::text, p_request_path text DEFAULT NULL::text, p_request_method text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
    audit_id UUID;
BEGIN
    INSERT INTO public.audit_logs (
        table_name,
        action,
        record_id,
        old_values,
        new_values,
        user_id,
        ip_address,
        user_agent,
        session_id,
        request_path,
        request_method
    ) VALUES (
        p_table_name,
        p_action,
        p_record_id,
        p_old_values,
        p_new_values,
        auth.uid(),
        p_ip_address,
        p_user_agent,
        p_session_id,
        p_request_path,
        p_request_method
    ) RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$function$;

-- Función handle_updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

-- Función handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
    INSERT INTO public.profiles (id, email, first_name, last_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
        COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
        COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'vendedor'::user_role)
    );
    RETURN NEW;
END;
$function$;

-- Función create_template_version
CREATE OR REPLACE FUNCTION public.create_template_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  -- Only create version if content actually changed
  IF OLD.content IS DISTINCT FROM NEW.content OR 
     OLD.static_content IS DISTINCT FROM NEW.static_content OR 
     OLD.dynamic_fields IS DISTINCT FROM NEW.dynamic_fields THEN
    
    INSERT INTO public.template_versions (
      template_id,
      version_number,
      content,
      static_content,
      dynamic_fields,
      created_by,
      change_notes,
      is_major_version
    ) VALUES (
      NEW.id,
      COALESCE((SELECT MAX(version_number) + 1 FROM public.template_versions WHERE template_id = NEW.id), 1),
      NEW.content,
      NEW.static_content,
      NEW.dynamic_fields,
      auth.uid(),
      'Automatic version created on template update',
      false
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Función update_template_workflow_state
CREATE OR REPLACE FUNCTION public.update_template_workflow_state(p_template_id uuid, p_new_state character varying, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  workflow_id UUID;
BEGIN
  INSERT INTO public.template_workflow_states (
    template_id,
    state,
    changed_by,
    notes
  ) VALUES (
    p_template_id,
    p_new_state,
    auth.uid(),
    p_notes
  ) RETURNING id INTO workflow_id;
  
  RETURN workflow_id;
END;
$function$;