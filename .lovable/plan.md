

## Plan: Implementar `generate-evidence-certificate` Edge Function + Integración

### Resumen

Crear una nueva Edge Function que genera un Certificado de Evidencia Legal como PDF profesional usando el HTML template provisto, y lo integra en el flujo de firma existente.

### Cambios

#### 1. SQL Migration
- Agregar columnas `evidence_certificate_url` y `evidence_certificate_hash` a `documents`
- Crear tabla `legal_evidence_certificates` con campos: `id`, `sale_id`, `document_id`, `signature_link_id`, `certificate_url`, `certificate_hash`, `payload jsonb`, `created_at`
- RLS: select para usuarios de la misma company, insert vía service role (desde Edge Function)

#### 2. Edge Function: `supabase/functions/generate-evidence-certificate/index.ts`
- Recibe `{ document_id, signature_link_id? }`
- Consulta datos de: `documents` (join `sales` + `companies`), `signature_links`, `signature_events`, `signature_identity_verification`, `signature_consent_records`, `process_traces`
- Construye `eventsRows` como filas HTML de tabla con la cronología
- Renderiza el HTML template con `renderTemplate()` (reemplazo de `{{placeholders}}`)
- Envía HTML a `RENDER_URL` (mismo patrón que `generate-base-pdf`)
- Sube PDF a `documents` bucket: `contracts/evidence/{saleId}/{documentId}.pdf`
- Calcula SHA-256
- Actualiza `documents.evidence_certificate_url` y `documents.evidence_certificate_hash`
- Inserta fila en `legal_evidence_certificates`
- Registra en `config.toml` con `verify_jwt = false`

#### 3. Integración en `finalize-signature-link`
- Después de cada `pades-sign-document` exitoso, llamar a `generate-evidence-certificate` con el `document_id` y `link.id`
- No bloqueante (try/catch)

#### 4. Actualizar `get-document-download-url`
- Agregar soporte para `kind = 'evidence'` que lee `evidence_certificate_url` en lugar de `base_pdf_url`/`signed_pdf_url`

#### 5. Frontend: `SignatureWorkflow.tsx`
- Agregar botón "Certificado de Evidencia" junto al botón de descarga existente en cada documento que tenga `evidence_certificate_url`
- Usa `get-document-download-url` con `kind: 'evidence'`

#### 6. Tipos TypeScript
- Actualizar `src/integrations/supabase/types.ts` con las nuevas columnas y tabla

### Detalles técnicos

- El HTML template completo del certificado se embebe como string en la Edge Function
- Se usan `escapeHtml()` y `renderTemplate()` como funciones helper
- El patrón de render/upload/hash sigue exactamente el de `generate-base-pdf`
- Storage path: `contracts/evidence/{saleId}/{documentId}.pdf` con formato `bucket:path`

