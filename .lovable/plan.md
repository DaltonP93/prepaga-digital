

## Plan: Firma Robusta End-to-End — DB + Edge Functions + Flujo

### Fase 1: Migraciones DB (estructura)

Crear tablas y columnas nuevas:

- **`document_fields`**: campos posicionados por firmante (tipo DigiSigner) — `signer_role`, `field_type`, `page`, `x/y/w/h`, `required`, `label`, `meta`
- **`document_field_values`**: valores completados por token — `field_id`, `signature_link_id`, `value_text`, `value_json`, `completed_at` (unique por field+link)
- **`documents`**: agregar `base_pdf_url`, `signed_pdf_url`, `base_pdf_hash`, `signed_pdf_hash`
- **`signature_links`**: agregar `step_order` (int default 1), `is_active` (bool default true)
- **`signature_events`**: agregar `signed_pdf_hash`
- RLS policies para `document_fields` (lectura por token) y `document_field_values` (lectura/escritura por token)

### Fase 2: Secrets

Solicitar al usuario que agregue 4 secrets nuevos:
- `RENDER_URL`, `RENDER_KEY` — servicio HTML→PDF
- `PADES_URL`, `PADES_KEY` — servicio PAdES

### Fase 3: Edge Functions

**A) `generate-base-pdf`** (nueva)
- Input: `{ document_id }`
- Leer `documents.content` (HTML) y `sale_id`
- POST a `RENDER_URL` con header `X-RENDER-KEY`
- Subir PDF al bucket `documents` en `contracts/base/{saleId}/{documentId}.pdf`
- Calcular SHA-256, actualizar `documents.base_pdf_url` y `base_pdf_hash`

**B) `pades-sign-document`** (nueva)
- Input: `{ document_id }`
- Descargar PDF base desde Storage usando `base_pdf_url`
- POST a `PADES_URL` (multipart) con header `X-SIGN-KEY`
- Subir PDF firmado a `contracts/signed/{saleId}/{documentId}.pdf`
- Calcular SHA-256, actualizar `signed_pdf_url`, `signed_pdf_hash`, `status='firmado'`, `is_final=true`
- Insertar en `signature_events` con `signature_method='pades'` y hash

**C) `get-document-download-url`** (nueva)
- Input: `{ document_id, kind: 'base'|'signed' }`
- Leer el path desde `base_pdf_url` o `signed_pdf_url`
- Generar signed URL desde bucket privado (expiración 1h)
- Retornar `{ url, expires_at }`

Config en `supabase/config.toml`: agregar las 3 funciones con `verify_jwt = false`

### Fase 4: Flujo de firma actualizado

En `src/hooks/useSignatureLinkPublic.ts`:

1. **`is_active` check**: En `useSignatureLinkByToken`, si el link tiene `is_active === false`, marcar como "no disponible aún" (no bloquear query, pero exponer flag)

2. **Al completar firma** (en `useSubmitSignatureLink`, después de crear documentos finales):
   - Llamar `generate-base-pdf` para cada documento firmado
   - Llamar `pades-sign-document` para cada documento
   - Si `recipientType === 'titular'` y existe link de contratada con `step_order=2`:
     - Activar link contratada (`is_active=true`)
     - Enviar WhatsApp vía `send-whatsapp` con URL `/firmar/{token}`

3. **Vista de éxito / descarga**: Reemplazar `window.print()` por botón que llama `get-document-download-url(doc_id, 'signed')`

### Fase 5: Activación secuencial de firmantes

En `src/hooks/useCreateAllSignatureLinks.ts`:
- Titular: `step_order=1, is_active=true`
- Contratada: `step_order=2, is_active=false`
- Adherentes: `step_order=1, is_active=true` (firman en paralelo con titular)

### Archivos a modificar/crear

```text
Nuevos:
  supabase/functions/generate-base-pdf/index.ts
  supabase/functions/pades-sign-document/index.ts
  supabase/functions/get-document-download-url/index.ts

Modificar:
  supabase/config.toml                          — agregar 3 funciones
  src/hooks/useSignatureLinkPublic.ts            — is_active check, llamar edge functions post-firma, descarga
  src/hooks/useCreateAllSignatureLinks.ts        — step_order + is_active por rol
  src/pages/SignatureView.tsx                    — botón descarga PDF firmado (reemplazar print)
```

### Orden de implementación recomendado

1. Migración DB (tablas + columnas)
2. Solicitar secrets al usuario
3. Edge Functions (generate-base-pdf → pades-sign-document → get-document-download-url)
4. Modificar flujo de firma (useSignatureLinkPublic + useCreateAllSignatureLinks)
5. UI de descarga en SignatureView

