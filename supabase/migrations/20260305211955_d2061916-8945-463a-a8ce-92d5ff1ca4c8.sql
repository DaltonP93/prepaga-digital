
-- 1) Campos posicionados por firmante (tipo DigiSigner)
CREATE TABLE IF NOT EXISTS public.document_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  signer_role text NOT NULL,
  field_type text NOT NULL,
  page int NOT NULL DEFAULT 1,
  x numeric NOT NULL,
  y numeric NOT NULL,
  w numeric NOT NULL,
  h numeric NOT NULL,
  required boolean NOT NULL DEFAULT true,
  label text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Valores completados por firmante (por token)
CREATE TABLE IF NOT EXISTS public.document_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id uuid NOT NULL REFERENCES public.document_fields(id) ON DELETE CASCADE,
  signature_link_id uuid NOT NULL REFERENCES public.signature_links(id) ON DELETE CASCADE,
  value_text text,
  value_json jsonb,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(field_id, signature_link_id)
);

-- 3) URLs y hashes de PDFs en documents
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS base_pdf_url text,
  ADD COLUMN IF NOT EXISTS signed_pdf_url text,
  ADD COLUMN IF NOT EXISTS base_pdf_hash text,
  ADD COLUMN IF NOT EXISTS signed_pdf_hash text;

-- 4) Control de orden y activación en signature_links
ALTER TABLE public.signature_links
  ADD COLUMN IF NOT EXISTS step_order int DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 5) Hash del PDF firmado en signature_events
ALTER TABLE public.signature_events
  ADD COLUMN IF NOT EXISTS signed_pdf_hash text;

-- 6) RLS para document_fields
ALTER TABLE public.document_fields ENABLE ROW LEVEL SECURITY;

-- Lectura por token de firma (público)
CREATE POLICY "signature_token_read_document_fields"
  ON public.document_fields FOR SELECT
  USING (
    document_id IN (
      SELECT d.id FROM public.documents d
      WHERE d.sale_id = public.get_sale_id_from_signature_token()
    )
  );

-- Gestión por usuarios autenticados de su empresa
CREATE POLICY "authenticated_manage_document_fields"
  ON public.document_fields FOR ALL
  TO authenticated
  USING (
    document_id IN (
      SELECT d.id FROM public.documents d
      JOIN public.sales s ON s.id = d.sale_id
      WHERE s.company_id = public.get_user_company_id(auth.uid())
    )
  )
  WITH CHECK (
    document_id IN (
      SELECT d.id FROM public.documents d
      JOIN public.sales s ON s.id = d.sale_id
      WHERE s.company_id = public.get_user_company_id(auth.uid())
    )
  );

-- 7) RLS para document_field_values
ALTER TABLE public.document_field_values ENABLE ROW LEVEL SECURITY;

-- Lectura/escritura por token de firma
CREATE POLICY "signature_token_read_field_values"
  ON public.document_field_values FOR SELECT
  USING (
    signature_link_id = public.get_signature_link_id_from_token()
    OR field_id IN (
      SELECT df.id FROM public.document_fields df
      JOIN public.documents d ON d.id = df.document_id
      WHERE d.sale_id = public.get_sale_id_from_signature_token()
    )
  );

CREATE POLICY "signature_token_insert_field_values"
  ON public.document_field_values FOR INSERT
  WITH CHECK (
    signature_link_id = public.get_signature_link_id_from_token()
  );

CREATE POLICY "signature_token_update_field_values"
  ON public.document_field_values FOR UPDATE
  USING (
    signature_link_id = public.get_signature_link_id_from_token()
  );

-- Gestión por usuarios autenticados
CREATE POLICY "authenticated_manage_field_values"
  ON public.document_field_values FOR ALL
  TO authenticated
  USING (
    field_id IN (
      SELECT df.id FROM public.document_fields df
      JOIN public.documents d ON d.id = df.document_id
      JOIN public.sales s ON s.id = d.sale_id
      WHERE s.company_id = public.get_user_company_id(auth.uid())
    )
  )
  WITH CHECK (
    field_id IN (
      SELECT df.id FROM public.document_fields df
      JOIN public.documents d ON d.id = df.document_id
      JOIN public.sales s ON s.id = d.sale_id
      WHERE s.company_id = public.get_user_company_id(auth.uid())
    )
  );
