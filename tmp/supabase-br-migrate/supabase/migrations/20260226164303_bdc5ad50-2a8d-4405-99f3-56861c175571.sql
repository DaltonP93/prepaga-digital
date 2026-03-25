
-- Phase 2: Evidence Bundles, Hash Anchors, Signature Policies

-- 1. Evidence Bundles - immutable chain of custody
CREATE TABLE public.signature_evidence_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_link_id uuid REFERENCES public.signature_links(id),
  signature_event_id uuid REFERENCES public.signature_events(id),
  sale_id uuid REFERENCES public.sales(id) NOT NULL,
  document_id uuid REFERENCES public.documents(id),
  document_hash text NOT NULL,
  pdf_hash text,
  evidence_json jsonb NOT NULL,
  bundle_hash text NOT NULL,
  storage_url text,
  created_at timestamptz DEFAULT now()
);

-- 2. Hash Anchors - external integrity proof (timestamp authority / blockchain)
CREATE TABLE public.hash_anchors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_bundle_id uuid REFERENCES public.signature_evidence_bundles(id) NOT NULL,
  hash_value text NOT NULL,
  anchor_type text NOT NULL DEFAULT 'internal', -- 'timestamp_rfc3161', 'blockchain', 'internal'
  anchor_reference text,
  anchored_at timestamptz DEFAULT now()
);

-- 3. Signature Policies - versioned legal policy
CREATE TABLE public.signature_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  title text NOT NULL DEFAULT 'Política de Firma Electrónica',
  content text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- RLS for evidence bundles
ALTER TABLE public.signature_evidence_bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert evidence bundle by signature token"
  ON public.signature_evidence_bundles FOR INSERT
  WITH CHECK (sale_id = get_sale_id_from_signature_token());

CREATE POLICY "Public can view evidence bundles by signature token"
  ON public.signature_evidence_bundles FOR SELECT
  USING (sale_id = get_sale_id_from_signature_token());

CREATE POLICY "Authenticated users can view evidence bundles"
  ON public.signature_evidence_bundles FOR SELECT
  USING (
    sale_id IN (
      SELECT s.id FROM public.sales s
      WHERE s.company_id IN (
        SELECT p.company_id FROM public.profiles p WHERE p.id = auth.uid()
      )
    )
  );

-- RLS for hash anchors
ALTER TABLE public.hash_anchors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert hash anchors by signature token"
  ON public.hash_anchors FOR INSERT
  WITH CHECK (
    evidence_bundle_id IN (
      SELECT id FROM public.signature_evidence_bundles
      WHERE sale_id = get_sale_id_from_signature_token()
    )
  );

CREATE POLICY "Authenticated users can view hash anchors"
  ON public.hash_anchors FOR SELECT
  USING (
    evidence_bundle_id IN (
      SELECT seb.id FROM public.signature_evidence_bundles seb
      WHERE seb.sale_id IN (
        SELECT s.id FROM public.sales s
        WHERE s.company_id IN (
          SELECT p.company_id FROM public.profiles p WHERE p.id = auth.uid()
        )
      )
    )
  );

-- RLS for signature policies (public read)
ALTER TABLE public.signature_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active signature policies"
  ON public.signature_policies FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage signature policies"
  ON public.signature_policies FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Insert default policy v1.0
INSERT INTO public.signature_policies (version, title, content, is_active) VALUES (
  'v1.0',
  'Política de Firma Electrónica - Prepaga Digital',
  'Esta política describe el marco técnico y jurídico aplicable a las firmas electrónicas realizadas a través de la plataforma Prepaga Digital, conforme a la Ley N° 4017/2010 de la República del Paraguay y estándares internacionales (ISO 14533, ISO 27001, UNCITRAL, eIDAS referencial).

## 1. Definición de Firma Electrónica
La firma electrónica es un conjunto de datos electrónicos que identifican al firmante y vinculan su voluntad al contenido del documento, conforme al artículo 2° de la Ley 4017/2010.

## 2. Método de Identificación
Antes de firmar, el sistema verifica la identidad del firmante mediante un código OTP (One-Time Password) enviado al correo electrónico registrado. Este código tiene validez de 5 minutos y un máximo de 3 intentos.

## 3. Evidencias Registradas
Cada firma registra: dirección IP, navegador y dispositivo (User-Agent), marca de tiempo ISO 8601, hash SHA-256 del documento, resultado de verificación de identidad, registro de consentimiento legal.

## 4. Integridad del Documento
Se genera un hash SHA-256 del contenido del documento al momento de la firma. Cualquier modificación posterior al documento será detectable mediante la comparación de hashes.

## 5. Paquete de Evidencia (Evidence Bundle)
Cada firma genera un paquete de evidencia inmutable que incluye: datos de verificación de identidad, registro de consentimiento, hash del documento, metadatos del firmante. Este paquete se almacena de forma segura y cuenta con su propio hash de integridad.

## 6. Conservación de Registros
Todos los registros de firma se conservan por un período mínimo de 10 años, conforme a las mejores prácticas internacionales y requisitos legales aplicables.

## 7. Procedimiento de Verificación
Cualquier parte interesada puede solicitar la verificación de una firma mediante la comparación del hash del documento original con el hash almacenado en el paquete de evidencia.

## 8. Proceso de Revocación
Los enlaces de firma pueden ser revocados por el emisor antes de su uso. Una vez completada la firma, el registro es inmutable.

## 9. Base Legal
- Ley N° 4017/2010 de Validez Jurídica de la Firma Electrónica, Firma Digital, Mensajes de Datos y Expediente Electrónico (Paraguay)
- Ley N° 6534/2020 de Protección de Datos Personales
- Convención de las Naciones Unidas sobre Comunicaciones Electrónicas (UNCITRAL)

## 10. Estándares Técnicos
- ISO 27001: Seguridad de la información
- ISO 14533: Firma electrónica
- ISO 29100: Marco de privacidad
- eIDAS: Firma electrónica avanzada (referencial)',
  true
);
