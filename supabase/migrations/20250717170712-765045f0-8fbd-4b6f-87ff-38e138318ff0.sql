-- Crear tabla para firmas digitales
CREATE TABLE public.signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES public.sales(id),
  document_id UUID REFERENCES public.documents(id),
  signature_data TEXT,
  signed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  status document_status DEFAULT 'pendiente'
);

-- Agregar campos para tokens de firma a sales
ALTER TABLE public.sales ADD COLUMN signature_token VARCHAR(255);
ALTER TABLE public.sales ADD COLUMN signature_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.sales ADD COLUMN signed_document_url TEXT;

-- Crear índices
CREATE INDEX idx_signatures_sale_id ON public.signatures(sale_id);
CREATE INDEX idx_signatures_document_id ON public.signatures(document_id);
CREATE INDEX idx_sales_signature_token ON public.sales(signature_token);

-- Habilitar RLS para signatures
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;

-- Políticas para signatures
CREATE POLICY "Users can view company signatures" 
  ON public.signatures 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.sales s 
    WHERE s.id = signatures.sale_id 
    AND s.company_id = get_user_company(auth.uid())
  ));

CREATE POLICY "Public signature creation" 
  ON public.signatures 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.sales s 
    WHERE s.id = signatures.sale_id 
    AND s.signature_token IS NOT NULL 
    AND s.signature_expires_at > now()
  ));