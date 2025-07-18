
-- FASE 1: Correcciones Críticas de Base de Datos

-- 1. Completar la función de numeración automática para incluir contract_number
CREATE OR REPLACE FUNCTION generate_request_number()
RETURNS trigger AS $$
DECLARE
  daily_sequence integer;
  monthly_sequence integer;
BEGIN
  -- Generar request_number si no existe
  IF NEW.request_number IS NULL THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM 'REQ-[0-9]{8}-([0-9]{4})') AS INTEGER)), 0) + 1
    INTO daily_sequence
    FROM sales 
    WHERE request_number LIKE 'REQ-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-%';
    
    IF daily_sequence IS NULL THEN
      daily_sequence := 1;
    END IF;
    
    NEW.request_number := 'REQ-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(daily_sequence::text, 4, '0');
  END IF;
  
  -- Generar contract_number si no existe
  IF NEW.contract_number IS NULL THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(contract_number FROM 'CON-[0-9]{6}-([0-9]{4})') AS INTEGER)), 0) + 1
    INTO monthly_sequence
    FROM sales 
    WHERE contract_number LIKE 'CON-' || TO_CHAR(NOW(), 'YYYYMM') || '-%';
    
    IF monthly_sequence IS NULL THEN
      monthly_sequence := 1;
    END IF;
    
    NEW.contract_number := 'CON-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(monthly_sequence::text, 4, '0');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Actualizar ventas existentes sin números generados
UPDATE sales 
SET 
  request_number = 'REQ-' || TO_CHAR(created_at, 'YYYYMMDD') || '-' || LPAD(ROW_NUMBER() OVER (PARTITION BY DATE(created_at) ORDER BY created_at)::text, 4, '0'),
  contract_number = 'CON-' || TO_CHAR(created_at, 'YYYYMM') || '-' || LPAD(ROW_NUMBER() OVER (PARTITION BY DATE_TRUNC('month', created_at) ORDER BY created_at)::text, 4, '0')
WHERE request_number IS NULL OR contract_number IS NULL;

-- 3. Crear tabla para configuración de empresas (personalización UI y APIs)
CREATE TABLE IF NOT EXISTS public.company_configurations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Configuración de Login/UI
  login_background_url text,
  login_logo_url text,
  login_title text DEFAULT 'Sistema de Gestión',
  login_subtitle text DEFAULT 'Acceso al sistema',
  primary_color text DEFAULT '#667eea',
  secondary_color text DEFAULT '#764ba2',
  
  -- Configuración de APIs
  whatsapp_api_enabled boolean DEFAULT false,
  whatsapp_api_token text,
  whatsapp_phone_number text,
  
  sms_api_enabled boolean DEFAULT false,
  sms_api_provider text, -- 'twilio', 'nexmo', etc
  sms_api_key text,
  sms_api_secret text,
  
  email_api_enabled boolean DEFAULT false,
  email_api_provider text, -- 'resend', 'sendgrid', etc
  email_api_key text,
  email_from_address text,
  
  -- Configuración adicional
  tracking_enabled boolean DEFAULT true,
  notifications_enabled boolean DEFAULT true,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 4. Crear tabla para tracking avanzado de documentos
CREATE TABLE IF NOT EXISTS public.document_tracking (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  document_type text NOT NULL, -- 'questionnaire', 'contract', 'signature'
  
  -- Información de acceso
  access_time timestamp with time zone DEFAULT now(),
  ip_address inet,
  user_agent text,
  device_type text, -- 'desktop', 'mobile', 'tablet'
  device_os text,
  browser text,
  
  -- Información de progreso
  action text NOT NULL, -- 'viewed', 'started', 'progress', 'completed', 'signed'
  progress_percentage integer DEFAULT 0,
  time_spent_seconds integer DEFAULT 0,
  
  -- Ubicación (opcional)
  country text,
  city text,
  
  -- Metadatos adicionales
  metadata jsonb DEFAULT '{}',
  
  created_at timestamp with time zone DEFAULT now()
);

-- 5. Políticas RLS para las nuevas tablas
ALTER TABLE public.company_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_tracking ENABLE ROW LEVEL SECURITY;

-- Políticas para company_configurations
CREATE POLICY "Admins can manage company configurations" 
ON public.company_configurations 
FOR ALL
USING (
  company_id = get_user_company(auth.uid()) AND
  get_user_role(auth.uid()) IN ('admin', 'super_admin')
)
WITH CHECK (
  company_id = get_user_company(auth.uid()) AND
  get_user_role(auth.uid()) IN ('admin', 'super_admin')
);

CREATE POLICY "Users can view their company configuration" 
ON public.company_configurations 
FOR SELECT
USING (company_id = get_user_company(auth.uid()));

-- Políticas para document_tracking
CREATE POLICY "Company users can view document tracking" 
ON public.document_tracking 
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM sales s 
    WHERE s.id = document_tracking.sale_id 
    AND s.company_id = get_user_company(auth.uid())
  )
);

CREATE POLICY "System can create tracking records" 
ON public.document_tracking 
FOR INSERT
WITH CHECK (true);

-- 6. Índices para optimización
CREATE INDEX IF NOT EXISTS idx_document_tracking_sale_id ON public.document_tracking(sale_id);
CREATE INDEX IF NOT EXISTS idx_document_tracking_action ON public.document_tracking(action);
CREATE INDEX IF NOT EXISTS idx_document_tracking_access_time ON public.document_tracking(access_time);
CREATE INDEX IF NOT EXISTS idx_company_configurations_company_id ON public.company_configurations(company_id);

-- 7. Triggers para updated_at
CREATE TRIGGER update_company_configurations_updated_at
  BEFORE UPDATE ON public.company_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
