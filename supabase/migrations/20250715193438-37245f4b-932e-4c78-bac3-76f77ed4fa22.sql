-- Crear tablas para sistema de preguntas en templates
CREATE TABLE public.template_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('yes_no', 'text', 'number', 'select_single', 'select_multiple')),
  is_required BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  conditional_logic JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.template_question_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.template_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  option_value TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.template_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.template_questions(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
  response_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.template_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_responses ENABLE ROW LEVEL SECURITY;

-- Policies for template_questions
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
  get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'gestor'::user_role]) 
  AND EXISTS (
    SELECT 1 FROM public.templates t
    WHERE t.id = template_questions.template_id 
    AND t.company_id = get_user_company(auth.uid())
  )
);

CREATE POLICY "Super admins can manage all template questions" 
ON public.template_questions 
FOR ALL 
USING (get_user_role(auth.uid()) = 'super_admin'::user_role);

-- Policies for template_question_options
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
  get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'gestor'::user_role]) 
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
USING (get_user_role(auth.uid()) = 'super_admin'::user_role);

-- Policies for template_responses
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
USING (get_user_role(auth.uid()) = 'super_admin'::user_role);

-- Create indexes for better performance
CREATE INDEX idx_template_questions_template_id ON public.template_questions(template_id);
CREATE INDEX idx_template_questions_order ON public.template_questions(template_id, order_index);
CREATE INDEX idx_template_question_options_question_id ON public.template_question_options(question_id);
CREATE INDEX idx_template_responses_template_id ON public.template_responses(template_id);
CREATE INDEX idx_template_responses_sale_id ON public.template_responses(sale_id);

-- Create trigger for updated_at
CREATE TRIGGER update_template_questions_updated_at
  BEFORE UPDATE ON public.template_questions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_template_responses_updated_at
  BEFORE UPDATE ON public.template_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();