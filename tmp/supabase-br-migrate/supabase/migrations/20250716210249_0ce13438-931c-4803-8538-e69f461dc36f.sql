-- Fase 1: Reestructuración de la tabla templates
ALTER TABLE public.templates
ADD COLUMN template_type text 
CHECK (template_type IN ('contract', 'declaration', 'questionnaire', 'other')),
ADD COLUMN static_content text,
ADD COLUMN dynamic_fields jsonb DEFAULT '[]'::jsonb,
ADD COLUMN version integer DEFAULT 1,
ADD COLUMN parent_template_id uuid REFERENCES public.templates(id);

-- Crear tabla de placeholders reutilizables
CREATE TABLE public.template_placeholders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placeholder_name text NOT NULL UNIQUE,
  placeholder_label text NOT NULL,
  placeholder_type text CHECK (placeholder_type IN ('text', 'date', 'number', 'select', 'boolean')),
  default_value text,
  validation_rules jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS en template_placeholders
ALTER TABLE public.template_placeholders ENABLE ROW LEVEL SECURITY;

-- Política para que todos los usuarios autenticados puedan ver placeholders
CREATE POLICY "Users can view placeholders" 
ON public.template_placeholders 
FOR SELECT 
USING (true);

-- Política para que admins y gestores puedan gestionar placeholders
CREATE POLICY "Admins and gestores can manage placeholders" 
ON public.template_placeholders 
FOR ALL 
USING (get_user_role(auth.uid()) = ANY (ARRAY['super_admin'::user_role, 'admin'::user_role, 'gestor'::user_role]));

-- Insertar placeholders estándar
INSERT INTO public.template_placeholders (placeholder_name, placeholder_label, placeholder_type) VALUES
('NOMBRE_CLIENTE', 'Nombre del Cliente', 'text'),
('APELLIDO_CLIENTE', 'Apellido del Cliente', 'text'),
('DNI_CLIENTE', 'DNI/CI del Cliente', 'text'),
('DOMICILIO_CLIENTE', 'Domicilio del Cliente', 'text'),
('FECHA_FIRMA', 'Fecha de Firma', 'date'),
('FECHA_NACIMIENTO', 'Fecha de Nacimiento', 'date'),
('MONTO_TOTAL', 'Monto Total', 'number'),
('NOMBRE_PLAN', 'Nombre del Plan', 'text'),
('NOMBRE_EMPRESA', 'Nombre de la Empresa', 'text'),
('TELEFONO_CLIENTE', 'Teléfono del Cliente', 'text'),
('EMAIL_CLIENTE', 'Email del Cliente', 'text'),
('ESTADO_CIVIL', 'Estado Civil', 'text'),
('FECHA_CONTRATO', 'Fecha del Contrato', 'date');

-- Crear tabla intermedia sale_templates
CREATE TABLE public.sale_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.templates(id),
  document_type text CHECK (document_type IN ('contract', 'declaration', 'questionnaire', 'other')),
  order_index integer DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'signed', 'completed')),
  signed_document_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(sale_id, template_id)
);

-- Habilitar RLS en sale_templates
ALTER TABLE public.sale_templates ENABLE ROW LEVEL SECURITY;

-- Políticas para sale_templates
CREATE POLICY "Users can view company sale templates" 
ON public.sale_templates 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM sales s 
  WHERE s.id = sale_templates.sale_id 
  AND s.company_id = get_user_company(auth.uid())
));

CREATE POLICY "Company users can manage sale templates" 
ON public.sale_templates 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM sales s 
  WHERE s.id = sale_templates.sale_id 
  AND s.company_id = get_user_company(auth.uid())
));

CREATE POLICY "Super admins can manage all sale templates" 
ON public.sale_templates 
FOR ALL 
USING (get_user_role(auth.uid()) = 'super_admin'::user_role);

-- Trigger para updated_at en template_placeholders
CREATE TRIGGER update_template_placeholders_updated_at
BEFORE UPDATE ON public.template_placeholders
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para updated_at en sale_templates
CREATE TRIGGER update_sale_templates_updated_at
BEFORE UPDATE ON public.sale_templates
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Actualizar templates existentes con valores por defecto
UPDATE public.templates 
SET template_type = 'questionnaire' 
WHERE template_type IS NULL;