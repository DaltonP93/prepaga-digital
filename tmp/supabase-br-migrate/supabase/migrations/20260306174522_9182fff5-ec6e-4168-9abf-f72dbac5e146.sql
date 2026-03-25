
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS evidence_certificate_url text,
ADD COLUMN IF NOT EXISTS evidence_certificate_hash text;

CREATE TABLE IF NOT EXISTS public.legal_evidence_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id),
  document_id uuid REFERENCES public.documents(id),
  signature_link_id uuid REFERENCES public.signature_links(id),
  certificate_url text,
  certificate_hash text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.legal_evidence_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view certificates from own company"
ON public.legal_evidence_certificates
FOR SELECT
TO authenticated
USING (
  sale_id IN (
    SELECT s.id FROM sales s
    WHERE s.company_id IN (
      SELECT p.company_id FROM profiles p WHERE p.id = auth.uid()
    )
  )
);

CREATE POLICY "Service role can insert certificates"
ON public.legal_evidence_certificates
FOR INSERT
TO authenticated
WITH CHECK (true);
