-- PASO 1: CORREGIR ERRORES CRÍTICOS DE RLS
-- Los errores en postgres_logs muestran violaciones de RLS en sale_documents y beneficiaries

-- 1. Corregir políticas de sale_documents
DROP POLICY IF EXISTS "Company users can manage sale documents" ON public.sale_documents;

CREATE POLICY "Company users can manage sale documents" 
ON public.sale_documents 
FOR ALL
USING (
  uploaded_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM sales s 
    WHERE s.id = sale_documents.sale_id 
    AND s.company_id = get_user_company(auth.uid())
  )
)
WITH CHECK (
  uploaded_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM sales s 
    WHERE s.id = sale_documents.sale_id 
    AND s.company_id = get_user_company(auth.uid())
  )
);

-- 2. Corregir políticas de beneficiaries
DROP POLICY IF EXISTS "Company users can manage beneficiaries" ON public.beneficiaries;

CREATE POLICY "Company users can manage beneficiaries" 
ON public.beneficiaries 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM sales s 
    WHERE s.id = beneficiaries.sale_id 
    AND s.company_id = get_user_company(auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sales s 
    WHERE s.id = beneficiaries.sale_id 
    AND s.company_id = get_user_company(auth.uid())
  )
);

-- PASO 2: AGREGAR CAMPOS PARA LOGIN PERSONALIZABLE
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS login_background_url text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS login_logo_url text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS login_title text DEFAULT 'Seguro Digital';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS login_subtitle text DEFAULT 'Sistema de Firma Digital';

-- PASO 3: TRACKING AVANZADO DE DOCUMENTOS
CREATE TABLE IF NOT EXISTS public.document_access_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  access_time timestamp with time zone NOT NULL DEFAULT now(),
  ip_address inet,
  user_agent text,
  device_type text,
  action text NOT NULL, -- 'viewed', 'started', 'completed', 'signed'
  session_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT document_access_logs_pkey PRIMARY KEY (id)
);

-- RLS para document_access_logs
ALTER TABLE public.document_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view access logs" 
ON public.document_access_logs 
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM documents d
    JOIN sales s ON d.sale_id = s.id
    WHERE d.id = document_access_logs.document_id 
    AND s.company_id = get_user_company(auth.uid())
  )
);

CREATE POLICY "System can create access logs" 
ON public.document_access_logs 
FOR INSERT
WITH CHECK (true);

-- PASO 4: PANEL DE CONFIGURACIÓN DE APIS
CREATE TABLE IF NOT EXISTS public.company_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  whatsapp_api_key text,
  sms_api_key text,
  email_api_key text,
  resend_api_key text,
  twilio_account_sid text,
  twilio_auth_token text,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT company_settings_pkey PRIMARY KEY (id)
);

-- RLS para company_settings
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage company settings" 
ON public.company_settings 
FOR ALL
USING (
  company_id = get_user_company(auth.uid()) AND
  get_user_role(auth.uid()) IN ('admin', 'super_admin')
)
WITH CHECK (
  company_id = get_user_company(auth.uid()) AND
  get_user_role(auth.uid()) IN ('admin', 'super_admin')
);

-- PASO 5: IDENTIFICADORES ÚNICOS PARA VENTAS
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS request_number text UNIQUE;

-- Crear secuencia para números de solicitud
CREATE SEQUENCE IF NOT EXISTS sales_request_number_seq;

-- Función para generar número de solicitud REQ-YYYYMMDD-XXXX
CREATE OR REPLACE FUNCTION generate_request_number() 
RETURNS trigger AS $$
DECLARE
  daily_sequence integer;
BEGIN
  IF NEW.request_number IS NULL THEN
    -- Obtener el siguiente número secuencial para el día
    SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM 'REQ-[0-9]{8}-([0-9]{4})') AS INTEGER)), 0) + 1
    INTO daily_sequence
    FROM sales 
    WHERE request_number LIKE 'REQ-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-%';
    
    -- Si no hay registros para el día, comenzar desde 1
    IF daily_sequence IS NULL THEN
      daily_sequence := 1;
    END IF;
    
    NEW.request_number := 'REQ-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(daily_sequence::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar número automáticamente
DROP TRIGGER IF EXISTS set_request_number ON public.sales;
CREATE TRIGGER set_request_number
BEFORE INSERT ON public.sales
FOR EACH ROW
EXECUTE FUNCTION generate_request_number();

-- PASO 6: AUDITORÍA AUTOMÁTICA - Agregar columnas de metadatos
ALTER TABLE public.signatures ADD COLUMN IF NOT EXISTS signed_pdf_url text;
ALTER TABLE public.signatures ADD COLUMN IF NOT EXISTS device_info jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.signatures ADD COLUMN IF NOT EXISTS completion_progress integer DEFAULT 0;

-- Trigger para updated_at en company_settings
CREATE TRIGGER update_company_settings_updated_at
BEFORE UPDATE ON public.company_settings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();