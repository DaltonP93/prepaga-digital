-- Agregar campos adicionales a audit_logs para tracking completo
ALTER TABLE public.audit_logs 
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS session_id TEXT,
ADD COLUMN IF NOT EXISTS request_path TEXT,
ADD COLUMN IF NOT EXISTS request_method TEXT;

-- Crear tabla para intentos de login fallidos
CREATE TABLE IF NOT EXISTS public.auth_attempts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    failure_reason TEXT,
    attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS para auth_attempts
ALTER TABLE public.auth_attempts ENABLE ROW LEVEL SECURITY;

-- Políticas para auth_attempts - solo super admins pueden ver intentos
CREATE POLICY "Super admins can view all auth attempts" 
ON public.auth_attempts 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'super_admin'::user_role);

-- Crear tabla para tokens de recuperación de contraseña
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS para password_reset_tokens
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Políticas para password_reset_tokens - solo el usuario puede ver sus tokens
CREATE POLICY "Users can view their own reset tokens" 
ON public.password_reset_tokens 
FOR SELECT 
USING (user_id = auth.uid());

-- Función para crear token de reset de contraseña
CREATE OR REPLACE FUNCTION public.create_password_reset_token(user_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    
    -- Crear nuevo token (válido por 1 hora)
    INSERT INTO public.password_reset_tokens (user_id, token, expires_at)
    VALUES (user_id_var, token_var, now() + INTERVAL '1 hour');
    
    RETURN token_var;
END;
$$;

-- Función para validar token de reset
CREATE OR REPLACE FUNCTION public.validate_reset_token(token_param TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Función mejorada de auditoría
CREATE OR REPLACE FUNCTION public.log_audit(
    p_table_name TEXT,
    p_action TEXT,
    p_record_id UUID DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL,
    p_request_path TEXT DEFAULT NULL,
    p_request_method TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;