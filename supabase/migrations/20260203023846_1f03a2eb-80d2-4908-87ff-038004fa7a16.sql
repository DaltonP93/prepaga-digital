
-- =============================================
-- PREPAGA DIGITAL - DATABASE SCHEMA
-- =============================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'gestor', 'vendedor');
CREATE TYPE public.sale_status AS ENUM ('borrador', 'enviado', 'firmado', 'completado', 'cancelado', 'pendiente', 'en_auditoria');
CREATE TYPE public.document_status AS ENUM ('pendiente', 'firmado', 'vencido');

-- 3. BASE TABLES (no foreign keys)

-- Companies
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#3B82F6',
    secondary_color VARCHAR(7) DEFAULT '#1E40AF',
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    website VARCHAR(255),
    tax_id VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Countries
CREATE TABLE public.countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(3) NOT NULL UNIQUE,
    phone_code VARCHAR(10),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Template Placeholders (global)
CREATE TABLE public.template_placeholders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    placeholder_name VARCHAR(100) NOT NULL UNIQUE,
    placeholder_label VARCHAR(255) NOT NULL,
    placeholder_type VARCHAR(50) DEFAULT 'text',
    description TEXT,
    default_value TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. USER ROLES TABLE (Security Best Practice)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'vendedor',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, role)
);

-- 5. PROFILES (linked to auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. COMPANY SETTINGS
CREATE TABLE public.company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    whatsapp_api_key TEXT,
    whatsapp_phone_id TEXT,
    sms_api_key TEXT,
    sms_sender_id TEXT,
    email_api_key TEXT,
    email_from_address VARCHAR(255),
    email_from_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id)
);

CREATE TABLE public.company_currency_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    currency_code VARCHAR(3) DEFAULT 'ARS',
    currency_symbol VARCHAR(5) DEFAULT '$',
    decimal_places INTEGER DEFAULT 2,
    thousand_separator VARCHAR(1) DEFAULT '.',
    decimal_separator VARCHAR(1) DEFAULT ',',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id)
);

CREATE TABLE public.company_ui_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    theme VARCHAR(20) DEFAULT 'light',
    sidebar_collapsed BOOLEAN DEFAULT false,
    dashboard_layout JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id)
);

-- 7. CLIENTS
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    dni VARCHAR(20),
    birth_date DATE,
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    country_id UUID REFERENCES public.countries(id),
    postal_code VARCHAR(20),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. PLANS
CREATE TABLE public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(12,2) NOT NULL DEFAULT 0,
    coverage_details JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. TEMPLATES
CREATE TABLE public.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT,
    is_active BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. SALES
CREATE TABLE public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
    salesperson_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
    status public.sale_status DEFAULT 'borrador',
    total_amount DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    signature_token UUID,
    signature_expires_at TIMESTAMPTZ,
    signed_at TIMESTAMPTZ,
    signed_ip VARCHAR(45),
    contract_pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. BENEFICIARIES
CREATE TABLE public.beneficiaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    dni VARCHAR(20),
    birth_date DATE,
    relationship VARCHAR(50),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. TEMPLATE QUESTIONS
CREATE TABLE public.template_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES public.templates(id) ON DELETE CASCADE NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) DEFAULT 'text',
    is_required BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    placeholder_name VARCHAR(100),
    validation_rules JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.template_question_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES public.template_questions(id) ON DELETE CASCADE NOT NULL,
    option_text VARCHAR(255) NOT NULL,
    option_value VARCHAR(255),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. TEMPLATE RESPONSES
CREATE TABLE public.template_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
    template_id UUID REFERENCES public.templates(id) ON DELETE CASCADE NOT NULL,
    question_id UUID REFERENCES public.template_questions(id) ON DELETE CASCADE NOT NULL,
    response_value TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 14. TEMPLATE VERSIONS
CREATE TABLE public.template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES public.templates(id) ON DELETE CASCADE NOT NULL,
    version_number INTEGER NOT NULL,
    content TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(template_id, version_number)
);

-- 15. TEMPLATE WORKFLOW
CREATE TABLE public.template_workflow_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES public.templates(id) ON DELETE CASCADE NOT NULL,
    state_name VARCHAR(100) NOT NULL,
    state_order INTEGER DEFAULT 0,
    is_final BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 16. TEMPLATE ANALYTICS & COMMENTS
CREATE TABLE public.template_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES public.templates(id) ON DELETE CASCADE NOT NULL,
    views_count INTEGER DEFAULT 0,
    completions_count INTEGER DEFAULT 0,
    avg_completion_time INTEGER,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.template_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES public.templates(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 17. DOCUMENTS & SIGNATURES
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    document_type VARCHAR(50),
    content TEXT,
    file_url TEXT,
    status public.document_status DEFAULT 'pendiente',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
    document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    signature_data TEXT NOT NULL,
    signer_name VARCHAR(255),
    signer_email VARCHAR(255),
    signer_ip VARCHAR(45),
    signed_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 18. SALE RELATED TABLES
CREATE TABLE public.sale_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
    template_id UUID REFERENCES public.templates(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(sale_id, template_id)
);

CREATE TABLE public.sale_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.sale_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    note_text TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.sale_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
    requirement_text TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 19. COMMUNICATION TABLES
CREATE TABLE public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.email_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    status VARCHAR(50) DEFAULT 'draft',
    sent_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.sms_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    sent_count INTEGER DEFAULT 0,
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.whatsapp_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
    phone_number VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.communication_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    channel VARCHAR(50) NOT NULL,
    direction VARCHAR(20) DEFAULT 'outbound',
    subject VARCHAR(255),
    content TEXT,
    status VARCHAR(50) DEFAULT 'sent',
    sent_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 20. SYSTEM TABLES
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.audit_processes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
    auditor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.auth_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN DEFAULT false,
    failure_reason VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    link VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.dashboard_widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    widget_type VARCHAR(100) NOT NULL,
    position INTEGER DEFAULT 0,
    config JSONB DEFAULT '{}',
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.file_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    entity_type VARCHAR(100),
    entity_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.process_traces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.information_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
    requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    request_type VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    response TEXT,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.document_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    access_type VARCHAR(50) DEFAULT 'view',
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 21. SECURITY DEFINER FUNCTION FOR ROLE CHECK
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role 
      WHEN 'super_admin' THEN 1 
      WHEN 'admin' THEN 2 
      WHEN 'gestor' THEN 3 
      WHEN 'vendedor' THEN 4 
    END
  LIMIT 1
$$;

-- 22. TRIGGER FUNCTIONS
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.create_template_version()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.content IS DISTINCT FROM NEW.content THEN
        INSERT INTO public.template_versions (template_id, version_number, content, created_by)
        VALUES (NEW.id, NEW.version, OLD.content, NEW.created_by);
        NEW.version = NEW.version + 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'vendedor');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 23. TRIGGERS
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER create_template_version_trigger BEFORE UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION create_template_version();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- 24. ENABLE RLS ON ALL TABLES
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_widgets ENABLE ROW LEVEL SECURITY;

-- 25. RLS POLICIES

-- User Roles: users can view their own roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Profiles: users can view/update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Companies: users can view their company
CREATE POLICY "Users can view own company" ON public.companies FOR SELECT USING (
    id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Admins can manage companies" ON public.companies FOR ALL USING (
    public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
);

-- Clients: company-based access
CREATE POLICY "Users can view company clients" ON public.clients FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Users can manage company clients" ON public.clients FOR ALL USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- Plans: company-based access
CREATE POLICY "Users can view company plans" ON public.plans FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Admins can manage plans" ON public.plans FOR ALL USING (
    public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
);

-- Templates: company-based access
CREATE POLICY "Users can view company templates" ON public.templates FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Gestors can manage templates" ON public.templates FOR ALL USING (
    public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor')
);

-- Sales: company-based + salesperson access
CREATE POLICY "Users can view company sales" ON public.sales FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Users can manage own sales" ON public.sales FOR ALL USING (
    salesperson_id = auth.uid() OR 
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestor')
);

-- Beneficiaries: through sales access
CREATE POLICY "Users can view sale beneficiaries" ON public.beneficiaries FOR SELECT USING (
    sale_id IN (SELECT id FROM public.sales WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
);
CREATE POLICY "Users can manage sale beneficiaries" ON public.beneficiaries FOR ALL USING (
    sale_id IN (SELECT id FROM public.sales WHERE salesperson_id = auth.uid() OR company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid() AND public.has_role(auth.uid(), 'admin')))
);

-- Template questions/options: through template access
CREATE POLICY "Users can view template questions" ON public.template_questions FOR SELECT USING (
    template_id IN (SELECT id FROM public.templates WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
);
CREATE POLICY "Users can view question options" ON public.template_question_options FOR SELECT USING (
    question_id IN (SELECT id FROM public.template_questions WHERE template_id IN (SELECT id FROM public.templates WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())))
);

-- Template responses: through sales access
CREATE POLICY "Users can view template responses" ON public.template_responses FOR SELECT USING (
    sale_id IN (SELECT id FROM public.sales WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
);
CREATE POLICY "Anyone can insert template responses" ON public.template_responses FOR INSERT WITH CHECK (true);

-- Documents: through sales access
CREATE POLICY "Users can view sale documents" ON public.documents FOR SELECT USING (
    sale_id IN (SELECT id FROM public.sales WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
);
CREATE POLICY "Users can manage sale documents" ON public.documents FOR ALL USING (
    sale_id IN (SELECT id FROM public.sales WHERE salesperson_id = auth.uid())
);

-- Signatures: through sales access
CREATE POLICY "Users can view signatures" ON public.signatures FOR SELECT USING (
    sale_id IN (SELECT id FROM public.sales WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
);
CREATE POLICY "Anyone can create signatures" ON public.signatures FOR INSERT WITH CHECK (true);

-- Notifications: user-specific
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());

-- Audit logs: admin only
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (
    public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
);

-- Dashboard widgets: user-specific
CREATE POLICY "Users can manage own widgets" ON public.dashboard_widgets FOR ALL USING (user_id = auth.uid());

-- 26. INDEXES FOR PERFORMANCE
CREATE INDEX idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX idx_clients_company_id ON public.clients(company_id);
CREATE INDEX idx_plans_company_id ON public.plans(company_id);
CREATE INDEX idx_templates_company_id ON public.templates(company_id);
CREATE INDEX idx_sales_company_id ON public.sales(company_id);
CREATE INDEX idx_sales_client_id ON public.sales(client_id);
CREATE INDEX idx_sales_salesperson_id ON public.sales(salesperson_id);
CREATE INDEX idx_sales_status ON public.sales(status);
CREATE INDEX idx_sales_signature_token ON public.sales(signature_token);
CREATE INDEX idx_beneficiaries_sale_id ON public.beneficiaries(sale_id);
CREATE INDEX idx_template_questions_template_id ON public.template_questions(template_id);
CREATE INDEX idx_template_responses_sale_id ON public.template_responses(sale_id);
CREATE INDEX idx_documents_sale_id ON public.documents(sale_id);
CREATE INDEX idx_signatures_sale_id ON public.signatures(sale_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
