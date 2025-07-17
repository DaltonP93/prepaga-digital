
-- Crear tabla para plantillas de cuestionarios
CREATE TABLE public.templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR NOT NULL,
  description TEXT,
  content JSONB NOT NULL DEFAULT '{}',
  company_id UUID REFERENCES public.companies(id),
  created_by UUID REFERENCES public.profiles(id),
  is_global BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  template_type TEXT DEFAULT 'questionnaire',
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  parent_template_id UUID REFERENCES public.templates(id),
  static_content TEXT,
  dynamic_fields JSONB DEFAULT '[]'
);

-- Crear tabla para preguntas de plantillas
CREATE TABLE public.template_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.templates(id) NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL, -- 'text', 'number', 'select', 'multiselect', 'date', 'boolean'
  is_required BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  conditional_logic JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Crear tabla para opciones de preguntas (para select, multiselect)
CREATE TABLE public.template_question_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID REFERENCES public.template_questions(id) NOT NULL,
  option_text TEXT NOT NULL,
  option_value TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Crear tabla para respuestas de plantillas
CREATE TABLE public.template_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.templates(id) NOT NULL,
  question_id UUID REFERENCES public.template_questions(id) NOT NULL,
  client_id UUID REFERENCES public.clients(id) NOT NULL,
  sale_id UUID REFERENCES public.sales(id),
  response_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Agregar campo template_id a sales
ALTER TABLE public.sales ADD COLUMN template_id UUID REFERENCES public.templates(id);

-- Crear índices para mejor rendimiento
CREATE INDEX idx_template_questions_template_id ON public.template_questions(template_id);
CREATE INDEX idx_template_question_options_question_id ON public.template_question_options(question_id);
CREATE INDEX idx_template_responses_template_id ON public.template_responses(template_id);
CREATE INDEX idx_template_responses_sale_id ON public.template_responses(sale_id);
CREATE INDEX idx_sales_template_id ON public.sales(template_id);

-- Habilitar RLS en todas las tablas
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_responses ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para templates
CREATE POLICY "Users can view company templates" 
  ON public.templates 
  FOR SELECT 
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can view global templates" 
  ON public.templates 
  FOR SELECT 
  USING (is_global = true);

CREATE POLICY "Admins and gestores can manage company templates" 
  ON public.templates 
  FOR ALL 
  USING (
    get_user_role(auth.uid()) IN ('admin', 'gestor') 
    AND company_id = get_user_company(auth.uid())
  );

CREATE POLICY "Super admins can manage all templates" 
  ON public.templates 
  FOR ALL 
  USING (get_user_role(auth.uid()) = 'super_admin');

-- Políticas RLS para template_questions
CREATE POLICY "Users can view company template questions" 
  ON public.template_questions 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.templates t 
    WHERE t.id = template_questions.template_id 
    AND (t.company_id = get_user_company(auth.uid()) OR t.is_global = true)
  ));

CREATE POLICY "Admins and gestores can manage company template questions" 
  ON public.template_questions 
  FOR ALL 
  USING (
    get_user_role(auth.uid()) IN ('admin', 'gestor') 
    AND EXISTS (
      SELECT 1 FROM public.templates t 
      WHERE t.id = template_questions.template_id 
      AND t.company_id = get_user_company(auth.uid())
    )
  );

CREATE POLICY "Super admins can manage all template questions" 
  ON public.template_questions 
  FOR ALL 
  USING (get_user_role(auth.uid()) = 'super_admin');

-- Políticas RLS para template_question_options
CREATE POLICY "Users can view question options" 
  ON public.template_question_options 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.template_questions tq
    JOIN public.templates t ON t.id = tq.template_id
    WHERE tq.id = template_question_options.question_id 
    AND (t.company_id = get_user_company(auth.uid()) OR t.is_global = true)
  ));

CREATE POLICY "Admins and gestores can manage question options" 
  ON public.template_question_options 
  FOR ALL 
  USING (
    get_user_role(auth.uid()) IN ('admin', 'gestor') 
    AND EXISTS (
      SELECT 1 FROM public.template_questions tq
      JOIN public.templates t ON t.id = tq.template_id
      WHERE tq.id = template_question_options.question_id 
      AND t.company_id = get_user_company(auth.uid())
    )
  );

CREATE POLICY "Super admins can manage all question options" 
  ON public.template_question_options 
  FOR ALL 
  USING (get_user_role(auth.uid()) = 'super_admin');

-- Políticas RLS para template_responses
CREATE POLICY "Users can view company template responses" 
  ON public.template_responses 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.templates t 
    WHERE t.id = template_responses.template_id 
    AND t.company_id = get_user_company(auth.uid())
  ));

CREATE POLICY "Company users can manage responses" 
  ON public.template_responses 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.templates t 
    WHERE t.id = template_responses.template_id 
    AND t.company_id = get_user_company(auth.uid())
  ));

CREATE POLICY "Public template response creation" 
  ON public.template_responses 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.sales s 
    JOIN public.templates t ON t.id = template_responses.template_id
    WHERE s.id = template_responses.sale_id 
    AND s.signature_token IS NOT NULL 
    AND s.signature_expires_at > now()
  ));

CREATE POLICY "Super admins can manage all template responses" 
  ON public.template_responses 
  FOR ALL 
  USING (get_user_role(auth.uid()) = 'super_admin');
