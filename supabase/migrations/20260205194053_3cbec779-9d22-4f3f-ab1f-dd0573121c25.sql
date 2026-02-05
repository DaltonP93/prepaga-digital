-- ================================================
-- TABLA: document_types
-- Catálogo de tipos de documentos del sistema
-- ================================================
CREATE TABLE IF NOT EXISTS public.document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar NOT NULL UNIQUE,
  name varchar NOT NULL,
  description text,
  requires_signature boolean DEFAULT false,
  is_required boolean DEFAULT false,
  applies_to varchar DEFAULT 'titular',
  template_id uuid REFERENCES public.templates(id),
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ================================================
-- TABLA: document_packages
-- Paquetes de documentos para envío conjunto
-- ================================================
CREATE TABLE IF NOT EXISTS public.document_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  package_type varchar DEFAULT 'firma_cliente',
  name varchar NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ================================================
-- TABLA: document_package_items
-- Documentos incluidos en cada paquete
-- ================================================
CREATE TABLE IF NOT EXISTS public.document_package_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.document_packages(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  is_required boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ================================================
-- TABLA: signature_links
-- Enlaces únicos para firma digital
-- ================================================
CREATE TABLE IF NOT EXISTS public.signature_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  package_id uuid REFERENCES public.document_packages(id),
  token varchar NOT NULL UNIQUE,
  recipient_type varchar NOT NULL,
  recipient_id uuid,
  recipient_email varchar NOT NULL,
  recipient_phone varchar,
  expires_at timestamptz NOT NULL,
  accessed_at timestamptz,
  access_count integer DEFAULT 0,
  ip_addresses jsonb DEFAULT '[]'::jsonb,
  status varchar DEFAULT 'pendiente',
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ================================================
-- TABLA: signature_workflow_steps
-- Estados del flujo de firma
-- ================================================
CREATE TABLE IF NOT EXISTS public.signature_workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_link_id uuid NOT NULL REFERENCES public.signature_links(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  step_type varchar NOT NULL,
  document_id uuid REFERENCES public.documents(id),
  status varchar DEFAULT 'pendiente',
  started_at timestamptz,
  completed_at timestamptz,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- ================================================
-- TABLA: beneficiary_documents
-- Documentos adjuntos de adherentes
-- ================================================
CREATE TABLE IF NOT EXISTS public.beneficiary_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiary_id uuid NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  document_type_id uuid REFERENCES public.document_types(id),
  file_name varchar NOT NULL,
  file_url text NOT NULL,
  file_type varchar,
  file_size integer,
  uploaded_by uuid REFERENCES auth.users(id),
  upload_source varchar DEFAULT 'vendedor',
  is_verified boolean DEFAULT false,
  verified_by uuid REFERENCES auth.users(id),
  verified_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ================================================
-- TABLA: whatsapp_messages
-- Registro de mensajes de WhatsApp enviados
-- ================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  sale_id uuid REFERENCES public.sales(id),
  signature_link_id uuid REFERENCES public.signature_links(id),
  phone_number varchar NOT NULL,
  message_type varchar DEFAULT 'signature_link',
  message_body text NOT NULL,
  whatsapp_message_id varchar,
  status varchar DEFAULT 'pending',
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  error_message text,
  sent_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- ================================================
-- TABLA: sale_workflow_states
-- Estados del flujo de venta
-- ================================================
CREATE TABLE IF NOT EXISTS public.sale_workflow_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  previous_status varchar,
  new_status varchar NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  change_reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- ================================================
-- MODIFICACIONES A beneficiaries
-- ================================================
ALTER TABLE public.beneficiaries ADD COLUMN IF NOT EXISTS document_type varchar;
ALTER TABLE public.beneficiaries ADD COLUMN IF NOT EXISTS document_number varchar;
ALTER TABLE public.beneficiaries ADD COLUMN IF NOT EXISTS gender varchar;
ALTER TABLE public.beneficiaries ADD COLUMN IF NOT EXISTS marital_status varchar;
ALTER TABLE public.beneficiaries ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.beneficiaries ADD COLUMN IF NOT EXISTS city varchar;
ALTER TABLE public.beneficiaries ADD COLUMN IF NOT EXISTS province varchar;
ALTER TABLE public.beneficiaries ADD COLUMN IF NOT EXISTS postal_code varchar;
ALTER TABLE public.beneficiaries ADD COLUMN IF NOT EXISTS occupation varchar;
ALTER TABLE public.beneficiaries ADD COLUMN IF NOT EXISTS has_preexisting_conditions boolean DEFAULT false;
ALTER TABLE public.beneficiaries ADD COLUMN IF NOT EXISTS preexisting_conditions_detail text;
ALTER TABLE public.beneficiaries ADD COLUMN IF NOT EXISTS signature_required boolean DEFAULT true;
ALTER TABLE public.beneficiaries ADD COLUMN IF NOT EXISTS signature_link_id uuid;

-- ================================================
-- MODIFICACIONES A sales
-- ================================================
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS sale_date date DEFAULT CURRENT_DATE;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS contract_number varchar;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS request_number varchar;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS requires_adherents boolean DEFAULT false;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS adherents_count integer DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS all_signatures_completed boolean DEFAULT false;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS signature_completed_at timestamptz;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS auditor_id uuid;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS audited_at timestamptz;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS audit_status varchar DEFAULT 'pendiente';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS audit_notes text;

-- ================================================
-- MODIFICACIONES A documents
-- ================================================
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS document_type_id uuid REFERENCES public.document_types(id);
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS generated_from_template boolean DEFAULT false;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS requires_signature boolean DEFAULT false;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS signed_by uuid;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS signed_at timestamptz;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS signature_data text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS beneficiary_id uuid REFERENCES public.beneficiaries(id);
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS is_final boolean DEFAULT false;

-- ================================================
-- MODIFICACIONES A templates
-- ================================================
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS template_type varchar DEFAULT 'contrato';
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS uses_dynamic_fields boolean DEFAULT true;
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS pdf_layout jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS requires_signature boolean DEFAULT true;

-- ================================================
-- ÍNDICES PARA RENDIMIENTO
-- ================================================
CREATE INDEX IF NOT EXISTS idx_signature_links_token ON public.signature_links(token);
CREATE INDEX IF NOT EXISTS idx_signature_links_sale ON public.signature_links(sale_id);
CREATE INDEX IF NOT EXISTS idx_signature_links_status ON public.signature_links(status);
CREATE INDEX IF NOT EXISTS idx_documents_sale_type ON public.documents(sale_id, document_type);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_sale ON public.beneficiaries(sale_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sale ON public.whatsapp_messages(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_workflow_states_sale ON public.sale_workflow_states(sale_id);
CREATE INDEX IF NOT EXISTS idx_beneficiary_documents_beneficiary ON public.beneficiary_documents(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_document_packages_sale ON public.document_packages(sale_id);

-- ================================================
-- HABILITAR RLS EN NUEVAS TABLAS
-- ================================================
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signature_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signature_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiary_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_workflow_states ENABLE ROW LEVEL SECURITY;

-- ================================================
-- POLÍTICAS RLS
-- ================================================

-- document_types
CREATE POLICY "Authenticated users can view document types"
  ON public.document_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage document types"
  ON public.document_types FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- signature_links
CREATE POLICY "Users can view signature links for their sales"
  ON public.signature_links FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = signature_links.sale_id
      AND (s.salesperson_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
    )
  );

CREATE POLICY "Users can create signature links for their sales"
  ON public.signature_links FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = sale_id
      AND (s.salesperson_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
    )
  );

CREATE POLICY "Users can update signature links for their sales"
  ON public.signature_links FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = signature_links.sale_id
      AND (s.salesperson_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
    )
  );

CREATE POLICY "Public can view signature links by token"
  ON public.signature_links FOR SELECT
  TO anon
  USING (true);

-- document_packages
CREATE POLICY "Users can view their document packages"
  ON public.document_packages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = document_packages.sale_id
      AND (s.salesperson_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
    )
  );

CREATE POLICY "Users can manage their document packages"
  ON public.document_packages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = document_packages.sale_id
      AND (s.salesperson_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
    )
  );

-- document_package_items
CREATE POLICY "Users can view their package items"
  ON public.document_package_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.document_packages dp
      JOIN public.sales s ON s.id = dp.sale_id
      WHERE dp.id = document_package_items.package_id
      AND (s.salesperson_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
    )
  );

CREATE POLICY "Users can manage their package items"
  ON public.document_package_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.document_packages dp
      JOIN public.sales s ON s.id = dp.sale_id
      WHERE dp.id = document_package_items.package_id
      AND (s.salesperson_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
    )
  );

-- signature_workflow_steps
CREATE POLICY "Users can view workflow steps"
  ON public.signature_workflow_steps FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.signature_links sl
      JOIN public.sales s ON s.id = sl.sale_id
      WHERE sl.id = signature_workflow_steps.signature_link_id
      AND (s.salesperson_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
    )
  );

CREATE POLICY "Users can manage workflow steps"
  ON public.signature_workflow_steps FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.signature_links sl
      JOIN public.sales s ON s.id = sl.sale_id
      WHERE sl.id = signature_workflow_steps.signature_link_id
      AND (s.salesperson_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
    )
  );

-- whatsapp_messages
CREATE POLICY "Users can view whatsapp messages"
  ON public.whatsapp_messages FOR SELECT
  TO authenticated
  USING (
    sent_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Users can create whatsapp messages"
  ON public.whatsapp_messages FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- beneficiary_documents
CREATE POLICY "Users can view beneficiary documents"
  ON public.beneficiary_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.beneficiaries b
      JOIN public.sales s ON s.id = b.sale_id
      WHERE b.id = beneficiary_documents.beneficiary_id
      AND (s.salesperson_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
    )
  );

CREATE POLICY "Users can manage beneficiary documents"
  ON public.beneficiary_documents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.beneficiaries b
      JOIN public.sales s ON s.id = b.sale_id
      WHERE b.id = beneficiary_documents.beneficiary_id
      AND (s.salesperson_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
    )
  );

-- sale_workflow_states
CREATE POLICY "Users can view sale workflow states"
  ON public.sale_workflow_states FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = sale_workflow_states.sale_id
      AND (s.salesperson_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'auditor'))
    )
  );

CREATE POLICY "Users can create sale workflow states"
  ON public.sale_workflow_states FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ================================================
-- FUNCIONES Y TRIGGERS
-- ================================================

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
      WHEN 'supervisor' THEN 3
      WHEN 'auditor' THEN 4
      WHEN 'gestor' THEN 5 
      WHEN 'vendedor' THEN 6 
    END
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.generate_contract_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  year_part TEXT;
  sequence_part TEXT;
  next_number INTEGER;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(contract_number FROM 6 FOR 6) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.sales
  WHERE contract_number LIKE year_part || '-%';
  
  sequence_part := LPAD(next_number::TEXT, 6, '0');
  NEW.contract_number := year_part || '-' || sequence_part;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS generate_contract_number_trigger ON public.sales;
CREATE TRIGGER generate_contract_number_trigger
  BEFORE INSERT ON public.sales
  FOR EACH ROW
  WHEN (NEW.contract_number IS NULL)
  EXECUTE FUNCTION public.generate_contract_number();

CREATE OR REPLACE FUNCTION public.check_all_signatures_completed(p_sale_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_links INTEGER;
  completed_links INTEGER;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completado')
  INTO total_links, completed_links
  FROM public.signature_links
  WHERE sale_id = p_sale_id;
  
  IF total_links = 0 THEN
    RETURN false;
  END IF;
  
  RETURN total_links = completed_links;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_advance_sale_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completado' AND OLD.status != 'completado' THEN
    IF public.check_all_signatures_completed(NEW.sale_id) THEN
      UPDATE public.sales
      SET 
        all_signatures_completed = true,
        signature_completed_at = NOW(),
        status = 'firmado'
      WHERE id = NEW.sale_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_advance_sale_status_trigger ON public.signature_links;
CREATE TRIGGER auto_advance_sale_status_trigger
  AFTER UPDATE ON public.signature_links
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_advance_sale_status();