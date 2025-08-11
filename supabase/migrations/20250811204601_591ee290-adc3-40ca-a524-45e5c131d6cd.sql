
-- 1. Definir tipos personalizados que faltan
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'gestor', 'vendedor', 'auditor', 'cliente');
CREATE TYPE sale_status AS ENUM ('borrador', 'pendiente', 'enviado', 'firmado', 'completado', 'cancelado', 'rechazado');
CREATE TYPE document_status AS ENUM ('pendiente', 'firmado', 'rechazado', 'expirado', 'cancelado');

-- 2. Crear tabla para configuraciones de UI de empresa (normalización)
CREATE TABLE company_ui_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  dark_mode BOOLEAN DEFAULT false,
  shadows BOOLEAN DEFAULT true,
  font_family VARCHAR DEFAULT 'Inter',
  border_radius VARCHAR DEFAULT '0.5rem',
  primary_color VARCHAR DEFAULT '#667eea',
  secondary_color VARCHAR DEFAULT '#764ba2',
  accent_color VARCHAR DEFAULT '#4ade80',
  favicon TEXT DEFAULT '/favicon.ico',
  custom_css TEXT DEFAULT '',
  login_background_url TEXT,
  login_logo_url TEXT,
  login_title TEXT DEFAULT 'Seguro Digital',
  login_subtitle TEXT DEFAULT 'Sistema de Firma Digital',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(company_id)
);

-- 3. Migrar datos existentes de UI de companies a company_ui_settings
INSERT INTO company_ui_settings (
  company_id, dark_mode, shadows, font_family, border_radius,
  primary_color, secondary_color, accent_color, favicon, custom_css,
  login_background_url, login_logo_url, login_title, login_subtitle
)
SELECT 
  id, dark_mode, shadows, font_family, border_radius,
  primary_color, secondary_color, accent_color, favicon, custom_css,
  login_background_url, login_logo_url, login_title, login_subtitle
FROM companies;

-- 4. Eliminar columnas de UI de la tabla companies
ALTER TABLE companies 
DROP COLUMN IF EXISTS dark_mode,
DROP COLUMN IF EXISTS shadows,
DROP COLUMN IF EXISTS font_family,
DROP COLUMN IF EXISTS border_radius,
DROP COLUMN IF EXISTS primary_color,
DROP COLUMN IF EXISTS secondary_color,
DROP COLUMN IF EXISTS accent_color,
DROP COLUMN IF EXISTS favicon,
DROP COLUMN IF EXISTS custom_css,
DROP COLUMN IF EXISTS login_background_url,
DROP COLUMN IF EXISTS login_logo_url,
DROP COLUMN IF EXISTS login_title,
DROP COLUMN IF EXISTS login_subtitle;

-- 5. Agregar campos de control de versiones y auditoría
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES profiles(id);

ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES profiles(id);

-- 6. Corregir relaciones faltantes
ALTER TABLE sale_requirements 
ADD CONSTRAINT fk_sale_requirements_completed_by 
FOREIGN KEY (completed_by) REFERENCES profiles(id);

ALTER TABLE communication_logs 
ADD CONSTRAINT fk_communication_logs_company 
FOREIGN KEY (company_id) REFERENCES companies(id);

-- 7. Corregir campos que deberían ser NOT NULL
ALTER TABLE template_responses 
ALTER COLUMN sale_id SET NOT NULL;

ALTER TABLE signatures 
ALTER COLUMN document_id SET NOT NULL;

-- 8. Crear índices críticos para rendimiento
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_company ON sales(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_client ON sales(client_id);
CREATE INDEX IF NOT EXISTS idx_sales_plan ON sales(plan_id);
CREATE INDEX IF NOT EXISTS idx_sales_salesperson ON sales(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_sales_template ON sales(template_id);
CREATE INDEX IF NOT EXISTS idx_signatures_status ON signatures(status);
CREATE INDEX IF NOT EXISTS idx_signatures_sale ON signatures(sale_id);
CREATE INDEX IF NOT EXISTS idx_documents_sale ON documents(sale_id);
CREATE INDEX IF NOT EXISTS idx_template_responses_sale ON template_responses(sale_id);
CREATE INDEX IF NOT EXISTS idx_template_responses_client ON template_responses(client_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_sale ON beneficiaries(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_notes_sale ON sale_notes(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_requirements_sale ON sale_requirements(sale_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_communication_logs_company ON communication_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_type ON communication_logs(type);

-- 9. Crear tablas para auditoría interna y trazabilidad
CREATE TABLE audit_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES sales(id) NOT NULL,
  auditor_id UUID REFERENCES profiles(id) NOT NULL,
  status VARCHAR DEFAULT 'pending', -- pending, in_review, approved, rejected, more_info_required
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE information_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_process_id UUID REFERENCES audit_processes(id) NOT NULL,
  requested_by UUID REFERENCES profiles(id) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR DEFAULT 'pending', -- pending, completed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE information_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  information_request_id UUID REFERENCES information_requests(id) NOT NULL,
  response TEXT,
  document_url VARCHAR,
  responded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE process_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES sales(id) NOT NULL,
  action VARCHAR NOT NULL,
  performed_by UUID REFERENCES profiles(id),
  client_action BOOLEAN DEFAULT false,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE whatsapp_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES sales(id) NOT NULL,
  recipient_phone VARCHAR NOT NULL,
  message_content TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status VARCHAR DEFAULT 'pending', -- pending, sent, delivered, read, failed
  notification_url VARCHAR NOT NULL,
  opened_at TIMESTAMP WITH TIME ZONE,
  signed_at TIMESTAMP WITH TIME ZONE,
  api_response JSONB,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 10. Crear índices para las nuevas tablas
CREATE INDEX idx_audit_processes_sale ON audit_processes(sale_id);
CREATE INDEX idx_audit_processes_auditor ON audit_processes(auditor_id);
CREATE INDEX idx_audit_processes_status ON audit_processes(status);
CREATE INDEX idx_information_requests_audit ON information_requests(audit_process_id);
CREATE INDEX idx_information_responses_request ON information_responses(information_request_id);
CREATE INDEX idx_process_traces_sale ON process_traces(sale_id);
CREATE INDEX idx_process_traces_action ON process_traces(action);
CREATE INDEX idx_whatsapp_notifications_sale ON whatsapp_notifications(sale_id);
CREATE INDEX idx_whatsapp_notifications_status ON whatsapp_notifications(status);

-- 11. Crear políticas RLS para las nuevas tablas
ALTER TABLE company_ui_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE information_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE information_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas para company_ui_settings
CREATE POLICY "Users can view their company UI settings" 
  ON company_ui_settings FOR SELECT 
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage company UI settings" 
  ON company_ui_settings FOR ALL 
  USING (
    company_id = get_user_company(auth.uid()) AND 
    get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'super_admin'::user_role])
  );

-- Políticas para audit_processes
CREATE POLICY "Auditors can manage audit processes" 
  ON audit_processes FOR ALL 
  USING (
    get_user_role(auth.uid()) = 'auditor'::user_role OR
    get_user_role(auth.uid()) = 'super_admin'::user_role
  );

CREATE POLICY "Users can view company audit processes" 
  ON audit_processes FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM sales s 
      WHERE s.id = audit_processes.sale_id 
      AND s.company_id = get_user_company(auth.uid())
    )
  );

-- Políticas para information_requests
CREATE POLICY "Users can manage company information requests" 
  ON information_requests FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM audit_processes ap 
      JOIN sales s ON s.id = ap.sale_id 
      WHERE ap.id = information_requests.audit_process_id 
      AND s.company_id = get_user_company(auth.uid())
    )
  );

-- Políticas para information_responses
CREATE POLICY "Users can manage company information responses" 
  ON information_responses FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM information_requests ir 
      JOIN audit_processes ap ON ap.id = ir.audit_process_id 
      JOIN sales s ON s.id = ap.sale_id 
      WHERE ir.id = information_responses.information_request_id 
      AND s.company_id = get_user_company(auth.uid())
    )
  );

-- Políticas para process_traces
CREATE POLICY "Users can view company process traces" 
  ON process_traces FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM sales s 
      WHERE s.id = process_traces.sale_id 
      AND s.company_id = get_user_company(auth.uid())
    )
  );

CREATE POLICY "System can create process traces" 
  ON process_traces FOR INSERT 
  WITH CHECK (true);

-- Políticas para whatsapp_notifications
CREATE POLICY "Users can manage company whatsapp notifications" 
  ON whatsapp_notifications FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM sales s 
      WHERE s.id = whatsapp_notifications.sale_id 
      AND s.company_id = get_user_company(auth.uid())
    )
  );

-- 12. Agregar trigger para updated_at en nuevas tablas
CREATE TRIGGER update_company_ui_settings_updated_at 
  BEFORE UPDATE ON company_ui_settings 
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_audit_processes_updated_at 
  BEFORE UPDATE ON audit_processes 
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
