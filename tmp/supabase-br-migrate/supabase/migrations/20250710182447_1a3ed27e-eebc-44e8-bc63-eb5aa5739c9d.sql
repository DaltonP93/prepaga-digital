
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE public.user_role AS ENUM ('super_admin', 'admin', 'gestor', 'vendedor');
CREATE TYPE public.document_status AS ENUM ('pendiente', 'firmado', 'vencido');
CREATE TYPE public.sale_status AS ENUM ('borrador', 'enviado', 'firmado', 'completado', 'cancelado');

-- Create companies table
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    active BOOLEAN DEFAULT true
);

-- Create user profiles table (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'vendedor',
    phone VARCHAR(50),
    avatar_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create templates table
CREATE TABLE public.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    content JSONB NOT NULL DEFAULT '{}',
    is_global BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

-- Create plans table
CREATE TABLE public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    coverage_details TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

-- Create clients table
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    dni VARCHAR(20),
    birth_date DATE,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sales table
CREATE TABLE public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.plans(id) ON DELETE RESTRICT,
    client_id UUID REFERENCES public.clients(id) ON DELETE RESTRICT,
    salesperson_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    status sale_status DEFAULT 'borrador',
    sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_amount DECIMAL(10,2),
    notes TEXT,
    signature_token VARCHAR(255) UNIQUE,
    signature_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create documents table
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.plans(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    document_type VARCHAR(100),
    content TEXT,
    file_url TEXT,
    template_id UUID REFERENCES public.templates(id),
    is_required BOOLEAN DEFAULT true,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create signatures table
CREATE TABLE public.signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    signature_data TEXT, -- Base64 encoded signature image
    signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    status document_status DEFAULT 'pendiente'
);

-- Create audit log table
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create security definer functions to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT role FROM public.profiles WHERE id = user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_user_company(user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT company_id FROM public.profiles WHERE id = user_id;
$$;

-- RLS Policies for companies
CREATE POLICY "Super admins can view all companies" ON public.companies
    FOR SELECT USING (public.get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Users can view their own company" ON public.companies
    FOR SELECT USING (id = public.get_user_company(auth.uid()));

CREATE POLICY "Super admins can manage all companies" ON public.companies
    FOR ALL USING (public.get_user_role(auth.uid()) = 'super_admin');

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Super admins can view all profiles" ON public.profiles
    FOR SELECT USING (public.get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Admins can view company profiles" ON public.profiles
    FOR SELECT USING (
        public.get_user_role(auth.uid()) IN ('admin', 'gestor') 
        AND company_id = public.get_user_company(auth.uid())
    );

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Super admins can manage all profiles" ON public.profiles
    FOR ALL USING (public.get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Admins can manage company profiles" ON public.profiles
    FOR ALL USING (
        public.get_user_role(auth.uid()) = 'admin'
        AND company_id = public.get_user_company(auth.uid())
    );

-- RLS Policies for templates
CREATE POLICY "Users can view global templates" ON public.templates
    FOR SELECT USING (is_global = true);

CREATE POLICY "Users can view company templates" ON public.templates
    FOR SELECT USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Super admins can manage all templates" ON public.templates
    FOR ALL USING (public.get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Admins and gestores can manage company templates" ON public.templates
    FOR ALL USING (
        public.get_user_role(auth.uid()) IN ('admin', 'gestor')
        AND company_id = public.get_user_company(auth.uid())
    );

-- RLS Policies for plans
CREATE POLICY "Users can view company plans" ON public.plans
    FOR SELECT USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Super admins can manage all plans" ON public.plans
    FOR ALL USING (public.get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Admins and gestores can manage company plans" ON public.plans
    FOR ALL USING (
        public.get_user_role(auth.uid()) IN ('admin', 'gestor')
        AND company_id = public.get_user_company(auth.uid())
    );

-- RLS Policies for clients
CREATE POLICY "Users can view company clients" ON public.clients
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.sales s 
            WHERE s.client_id = clients.id 
            AND s.company_id = public.get_user_company(auth.uid())
        )
    );

CREATE POLICY "Super admins can manage all clients" ON public.clients
    FOR ALL USING (public.get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Company users can manage clients" ON public.clients
    FOR ALL USING (public.get_user_role(auth.uid()) IS NOT NULL);

-- RLS Policies for sales
CREATE POLICY "Users can view company sales" ON public.sales
    FOR SELECT USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Super admins can manage all sales" ON public.sales
    FOR ALL USING (public.get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Company users can manage sales" ON public.sales
    FOR ALL USING (company_id = public.get_user_company(auth.uid()));

-- RLS Policies for documents
CREATE POLICY "Users can view company documents" ON public.documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.sales s 
            WHERE s.id = documents.sale_id 
            AND s.company_id = public.get_user_company(auth.uid())
        )
    );

CREATE POLICY "Public signature access" ON public.documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.sales s 
            WHERE s.id = documents.sale_id 
            AND s.signature_token IS NOT NULL
        )
    );

CREATE POLICY "Company users can manage documents" ON public.documents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.sales s 
            WHERE s.id = documents.sale_id 
            AND s.company_id = public.get_user_company(auth.uid())
        )
    );

-- RLS Policies for signatures
CREATE POLICY "Users can view company signatures" ON public.signatures
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.sales s 
            WHERE s.id = signatures.sale_id 
            AND s.company_id = public.get_user_company(auth.uid())
        )
    );

CREATE POLICY "Public signature creation" ON public.signatures
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sales s 
            WHERE s.id = signatures.sale_id 
            AND s.signature_token IS NOT NULL
            AND s.signature_expires_at > NOW()
        )
    );

-- RLS Policies for audit logs
CREATE POLICY "Super admins can view all audit logs" ON public.audit_logs
    FOR SELECT USING (public.get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Users can view their own audit logs" ON public.audit_logs
    FOR SELECT USING (user_id = auth.uid());

-- Create trigger function for profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, first_name, last_name)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data ->> 'first_name',
        NEW.raw_user_meta_data ->> 'last_name'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function for updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER templates_updated_at
    BEFORE UPDATE ON public.templates
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER plans_updated_at
    BEFORE UPDATE ON public.plans
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER sales_updated_at
    BEFORE UPDATE ON public.sales
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Insert sample data for testing
INSERT INTO public.companies (id, name, address, phone, email) VALUES 
('00000000-0000-0000-0000-000000000001', 'MediCorp SA', 'Av. Corrientes 1234, CABA', '+54 11 4567-8901', 'info@medicorp.com'),
('00000000-0000-0000-0000-000000000002', 'Salud Plus', 'Av. Santa Fe 5678, CABA', '+54 11 2345-6789', 'contacto@saludplus.com'),
('00000000-0000-0000-0000-000000000003', 'VidaSana', 'Av. Rivadavia 9012, CABA', '+54 11 9876-5432', 'info@vidasana.com');
