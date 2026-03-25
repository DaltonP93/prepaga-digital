
-- ==============================================
-- ADVANCED E-SIGNATURE SYSTEM TABLES
-- Aligned with Ley 4017/2010, ISO 14533, eIDAS
-- ==============================================

-- 1. Identity verification records (OTP-based)
CREATE TABLE public.signature_identity_verification (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  signature_link_id UUID NOT NULL REFERENCES public.signature_links(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  auth_method TEXT NOT NULL DEFAULT 'OTP_EMAIL',
  destination_masked TEXT,
  otp_code_hash TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  ip_address TEXT,
  user_agent TEXT,
  result TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Legal consent records
CREATE TABLE public.signature_consent_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  signature_link_id UUID NOT NULL REFERENCES public.signature_links(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  consent_text_version TEXT NOT NULL DEFAULT 'v1.0',
  consent_text TEXT NOT NULL,
  checkbox_state BOOLEAN NOT NULL DEFAULT false,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Signature events (forensic log)
CREATE TABLE public.signature_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  signature_link_id UUID NOT NULL REFERENCES public.signature_links(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  document_hash TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  identity_verified BOOLEAN NOT NULL DEFAULT false,
  identity_verification_id UUID REFERENCES public.signature_identity_verification(id),
  consent_record_id UUID REFERENCES public.signature_consent_records(id),
  document_version TEXT,
  signature_method TEXT NOT NULL DEFAULT 'electronic',
  evidence_bundle_hash TEXT,
  evidence_bundle_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.signature_identity_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signature_consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signature_events ENABLE ROW LEVEL SECURITY;

-- RLS policies: Public access via signature token for signing flow
CREATE POLICY "Public can insert identity verification by token"
  ON public.signature_identity_verification FOR INSERT
  WITH CHECK (sale_id = get_sale_id_from_signature_token());

CREATE POLICY "Public can view own identity verification by token"
  ON public.signature_identity_verification FOR SELECT
  USING (sale_id = get_sale_id_from_signature_token());

CREATE POLICY "Public can update identity verification by token"
  ON public.signature_identity_verification FOR UPDATE
  USING (sale_id = get_sale_id_from_signature_token());

CREATE POLICY "Public can insert consent record by token"
  ON public.signature_consent_records FOR INSERT
  WITH CHECK (sale_id = get_sale_id_from_signature_token());

CREATE POLICY "Public can view consent records by token"
  ON public.signature_consent_records FOR SELECT
  USING (sale_id = get_sale_id_from_signature_token());

CREATE POLICY "Public can insert signature event by token"
  ON public.signature_events FOR INSERT
  WITH CHECK (sale_id = get_sale_id_from_signature_token());

CREATE POLICY "Public can view signature events by token"
  ON public.signature_events FOR SELECT
  USING (sale_id = get_sale_id_from_signature_token());

-- Authenticated users can view for audit purposes
CREATE POLICY "Authenticated users can view identity verifications"
  ON public.signature_identity_verification FOR SELECT
  USING (sale_id IN (
    SELECT id FROM public.sales WHERE company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Authenticated users can view consent records"
  ON public.signature_consent_records FOR SELECT
  USING (sale_id IN (
    SELECT id FROM public.sales WHERE company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Authenticated users can view signature events"
  ON public.signature_events FOR SELECT
  USING (sale_id IN (
    SELECT id FROM public.sales WHERE company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  ));
