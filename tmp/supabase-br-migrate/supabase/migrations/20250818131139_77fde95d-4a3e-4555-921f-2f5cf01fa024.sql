
-- Crear índices en claves foráneas
CREATE INDEX IF NOT EXISTS idx_sales_client_id ON sales(client_id);
CREATE INDEX IF NOT EXISTS idx_sales_plan_id ON sales(plan_id);
CREATE INDEX IF NOT EXISTS idx_sales_salesperson_id ON sales(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_sales_company_id ON sales(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_template_id ON sales(template_id);

CREATE INDEX IF NOT EXISTS idx_templates_company_id ON templates(company_id);
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON templates(created_by);

CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);

CREATE INDEX IF NOT EXISTS idx_plans_company_id ON plans(company_id);
CREATE INDEX IF NOT EXISTS idx_plans_created_by ON plans(created_by);

CREATE INDEX IF NOT EXISTS idx_documents_sale_id ON documents(sale_id);
CREATE INDEX IF NOT EXISTS idx_documents_plan_id ON documents(plan_id);
CREATE INDEX IF NOT EXISTS idx_documents_template_id ON documents(template_id);

CREATE INDEX IF NOT EXISTS idx_signatures_sale_id ON signatures(sale_id);
CREATE INDEX IF NOT EXISTS idx_signatures_document_id ON signatures(document_id);

CREATE INDEX IF NOT EXISTS idx_beneficiaries_sale_id ON beneficiaries(sale_id);

CREATE INDEX IF NOT EXISTS idx_sale_notes_sale_id ON sale_notes(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_notes_user_id ON sale_notes(user_id);

CREATE INDEX IF NOT EXISTS idx_template_responses_template_id ON template_responses(template_id);
CREATE INDEX IF NOT EXISTS idx_template_responses_client_id ON template_responses(client_id);
CREATE INDEX IF NOT EXISTS idx_template_responses_sale_id ON template_responses(sale_id);

-- Crear índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_dni ON clients(dni);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_created_at_desc ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_sale_date_desc ON sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_contract_number ON sales(contract_number);
CREATE INDEX IF NOT EXISTS idx_sales_request_number ON sales(request_number);

CREATE INDEX IF NOT EXISTS idx_clients_created_at_desc ON clients(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_templates_created_at_desc ON templates(created_at DESC);

-- Crear tabla de logs de auditoría si no existe
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR NOT NULL,
    action VARCHAR NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    user_id UUID,
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    request_path TEXT,
    request_method TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at_desc ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON audit_logs(record_id);

-- Habilitar RLS en todas las tablas principales
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Políticas RLS mejoradas para sales
DROP POLICY IF EXISTS "Company users can manage sales" ON sales;
CREATE POLICY "Company users can manage sales" ON sales
FOR ALL USING (
  company_id = get_user_company(auth.uid()) OR 
  get_user_role(auth.uid()) = 'super_admin' OR
  salesperson_id = auth.uid()
);

-- Políticas RLS para clients
DROP POLICY IF EXISTS "Company users can manage clients" ON clients;
CREATE POLICY "Company users can manage clients" ON clients
FOR ALL USING (
  get_user_role(auth.uid()) IS NOT NULL AND (
    get_user_role(auth.uid()) = 'super_admin' OR
    get_user_company(auth.uid()) IS NOT NULL
  )
);

-- Políticas RLS para templates
DROP POLICY IF EXISTS "Company users can manage templates" ON templates;
CREATE POLICY "Company users can manage templates" ON templates
FOR ALL USING (
  company_id = get_user_company(auth.uid()) OR 
  get_user_role(auth.uid()) = 'super_admin'
);

-- Políticas RLS para audit_logs
CREATE POLICY "Super admins can view all audit logs" ON audit_logs
FOR SELECT USING (get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Users can view their own audit logs" ON audit_logs
FOR SELECT USING (user_id = auth.uid());

-- Funciones auxiliares para obtener información del usuario
CREATE OR REPLACE FUNCTION get_user_company(user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT company_id FROM public.profiles WHERE id = user_id;
$$;

CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT role FROM public.profiles WHERE id = user_id;
$$;

-- Función para logging de auditoría
CREATE OR REPLACE FUNCTION log_audit(
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
SET search_path = ''
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
