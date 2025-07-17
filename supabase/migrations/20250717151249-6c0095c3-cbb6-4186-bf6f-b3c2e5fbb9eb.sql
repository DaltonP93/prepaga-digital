
-- Crear tabla para notas de ventas (comentarios internos)
CREATE TABLE public.sale_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla para requisitos de ventas (checklist dinámico)
CREATE TABLE public.sale_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  requirement_name TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_by UUID REFERENCES public.profiles(id),
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla para beneficiarios
CREATE TABLE public.beneficiaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dni TEXT,
  birth_date DATE,
  relationship TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla para digitalizaciones (documentos subidos)
CREATE TABLE public.sale_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  observations TEXT,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Agregar nuevos campos a la tabla sales para información laboral y contractual
ALTER TABLE public.sales ADD COLUMN workplace TEXT;
ALTER TABLE public.sales ADD COLUMN profession TEXT;
ALTER TABLE public.sales ADD COLUMN work_phone TEXT;
ALTER TABLE public.sales ADD COLUMN work_address TEXT;
ALTER TABLE public.sales ADD COLUMN signature_modality TEXT;
ALTER TABLE public.sales ADD COLUMN maternity_bonus BOOLEAN DEFAULT false;
ALTER TABLE public.sales ADD COLUMN immediate_validity BOOLEAN DEFAULT false;
ALTER TABLE public.sales ADD COLUMN leads_id TEXT;
ALTER TABLE public.sales ADD COLUMN pediatrician TEXT;
ALTER TABLE public.sales ADD COLUMN birth_place TEXT;
ALTER TABLE public.sales ADD COLUMN contract_number TEXT;
ALTER TABLE public.sales ADD COLUMN last_process TEXT;

-- Crear índices para mejorar el rendimiento
CREATE INDEX idx_sale_notes_sale_id ON public.sale_notes(sale_id);
CREATE INDEX idx_sale_requirements_sale_id ON public.sale_requirements(sale_id);
CREATE INDEX idx_beneficiaries_sale_id ON public.beneficiaries(sale_id);
CREATE INDEX idx_sale_documents_sale_id ON public.sale_documents(sale_id);

-- Crear políticas RLS para las nuevas tablas
ALTER TABLE public.sale_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_documents ENABLE ROW LEVEL SECURITY;

-- Políticas para sale_notes
CREATE POLICY "Company users can manage sale notes" 
  ON public.sale_notes 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.sales s 
    WHERE s.id = sale_notes.sale_id 
    AND s.company_id = get_user_company(auth.uid())
  ));

-- Políticas para sale_requirements
CREATE POLICY "Company users can manage sale requirements" 
  ON public.sale_requirements 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.sales s 
    WHERE s.id = sale_requirements.sale_id 
    AND s.company_id = get_user_company(auth.uid())
  ));

-- Políticas para beneficiaries
CREATE POLICY "Company users can manage beneficiaries" 
  ON public.beneficiaries 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.sales s 
    WHERE s.id = beneficiaries.sale_id 
    AND s.company_id = get_user_company(auth.uid())
  ));

-- Políticas para sale_documents
CREATE POLICY "Company users can manage sale documents" 
  ON public.sale_documents 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.sales s 
    WHERE s.id = sale_documents.sale_id 
    AND s.company_id = get_user_company(auth.uid())
  ));

-- Triggers para updated_at
CREATE TRIGGER handle_updated_at_sale_notes 
  BEFORE UPDATE ON public.sale_notes 
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at_sale_requirements 
  BEFORE UPDATE ON public.sale_requirements 
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at_beneficiaries 
  BEFORE UPDATE ON public.beneficiaries 
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at_sale_documents 
  BEFORE UPDATE ON public.sale_documents 
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
