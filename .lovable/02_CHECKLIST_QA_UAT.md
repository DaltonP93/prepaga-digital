# CHECKLIST QA / UAT — PREPAGA DIGITAL
## Validación completa antes de producción

---

## PRE-CHECK TÉCNICO

### Microservicios on-prem
- [ ] `curl https://prepaga.saa.com.py/render/health` → `{"ok":true}`
- [ ] `curl https://prepaga.saa.com.py/pades/health` → `{"ok":true}`
- [ ] Test render manual funciona (devuelve PDF)
- [ ] Test firma PAdES manual funciona (Edge detecta firma)

### Supabase Secrets
Verificar en Edge Functions → Settings → Secrets:
- [ ] `PUBLIC_APP_URL = https://prepaga.saa.com.py`
- [ ] `RENDER_URL` configurado
- [ ] `RENDER_KEY` configurado
- [ ] `PADES_URL` configurado
- [ ] `PADES_KEY` configurado
- [ ] `STORAGE_BUCKET = documents`

### Storage
- [ ] Bucket `documents` existe y es **privado**
- [ ] Signed URL funciona desde Edge Function

### Base de datos
```sql
-- Verificar columnas necesarias
SELECT column_name FROM information_schema.columns
WHERE table_name = 'documents'
  AND column_name IN ('base_pdf_url','signed_pdf_url','base_pdf_hash','signed_pdf_hash');

SELECT column_name FROM information_schema.columns
WHERE table_name = 'signature_links'
  AND column_name IN ('step_order','is_active');

SELECT column_name FROM information_schema.columns
WHERE table_name = 'email_templates'
  AND column_name IN ('channel','template_key');
```
- [ ] Todas las columnas existen

### Plantillas WhatsApp
```sql
SELECT template_key, is_active FROM email_templates
WHERE channel = 'whatsapp' ORDER BY template_key;
```
- [ ] `signature_link_titular` activa
- [ ] `signature_link_adherente` activa
- [ ] `signature_link_contratada` activa
- [ ] `reminder_signature` activa

### company_settings para la empresa de prueba
```sql
SELECT contratada_signer_name, contratada_signer_dni,
       contratada_signer_email, contratada_signature_mode
FROM company_settings WHERE company_id = 'TU_COMPANY_ID';
```
- [ ] `contratada_signer_name` tiene valor real (ej: "Eder Arguello")
- [ ] `contratada_signer_dni` tiene valor
- [ ] `contratada_signature_mode = 'link'`

---

## SETUP DE DATOS DE PRUEBA

```sql
-- Verificar venta de prueba
SELECT id, status, company_id, contract_number FROM sales WHERE id = 'TU_SALE_ID';

-- Verificar signature_links
SELECT recipient_type, step_order, is_active, status, recipient_phone
FROM signature_links WHERE sale_id = 'TU_SALE_ID' ORDER BY step_order, recipient_type;

-- Verificar documentos
SELECT document_type, beneficiary_id, is_final, status
FROM documents WHERE sale_id = 'TU_SALE_ID' AND document_type != 'firma';
```

Debe existir:
- [ ] 1 link `titular` — `is_active=true`, `step_order=1`
- [ ] 1 link `adherente` — `is_active=true`, `step_order=1`
- [ ] 1 link `contratada` — `is_active=false`, `step_order=2`, `recipient_phone` no nulo
- [ ] 1 documento `contrato` con `is_final=true`
- [ ] 1 documento `ddjj_salud` titular con `beneficiary_id IS NULL`, `is_final=true`
- [ ] 1 documento `ddjj_salud` adherente con `beneficiary_id = adherente.id`, `is_final=true`

---

## PRUEBA RÁPIDA (sin adherentes)

**Setup:** 1 titular + 0 adherentes + 1 contratada

### Paso 1: Titular firma
- [ ] Abre `/firmar/:token_titular`
- [ ] OTP se envía y valida correctamente
- [ ] Consentimiento se guarda en `signature_consent_records`
- [ ] Firma sin errores
- [ ] `finalize-signature-link` corre (ver logs Supabase)

**Verificar en DB:**
```sql
SELECT status, completed_at FROM signature_links WHERE recipient_type = 'titular' AND sale_id = 'TU_SALE_ID';
SELECT document_type, base_pdf_url, signed_pdf_url, status FROM documents WHERE sale_id = 'TU_SALE_ID' AND document_type != 'firma';
SELECT is_active, status FROM signature_links WHERE recipient_type = 'contratada' AND sale_id = 'TU_SALE_ID';
```
- [ ] Titular → `status = completado`
- [ ] DDJJ titular → `base_pdf_url` no nulo
- [ ] DDJJ titular → `signed_pdf_url` no nulo
- [ ] Contrato → `signed_pdf_url` sigue NULL ✅ (no debe firmarse aún)
- [ ] Contratada → `is_active = true` ✅ (se activó porque no hay adherentes)

**Verificar WhatsApp:**
```sql
SELECT phone_number, message_body, status FROM whatsapp_messages
WHERE sale_id = 'TU_SALE_ID' ORDER BY created_at DESC LIMIT 5;
```
- [ ] Mensaje enviado al representante con plantilla `signature_link_contratada`
- [ ] `{{contractNumber}}`, `{{expirationDate}}`, `{{signatureUrl}}` reemplazados
- [ ] No quedan `{{variables}}` sin reemplazar

### Paso 2: Contratada firma
- [ ] Abre `/firmar/:token_contratada`
- [ ] Muestra solo el contrato (no DDJJ) ✅
- [ ] Firma sin errores

**Verificar:**
```sql
SELECT document_type, signed_pdf_url, signed_pdf_hash, status, signed_at
FROM documents WHERE sale_id = 'TU_SALE_ID' AND document_type = 'contrato';
```
- [ ] `signed_pdf_url` no nulo ✅
- [ ] `status = firmado`
- [ ] `signed_at` tiene fecha
- [ ] Archivo existe en Storage: `contracts/signed/{saleId}/{docId}.pdf`
- [ ] PDF abre en Edge y **detecta firma digital** ✅

---

## PRUEBA COMPLETA (1 titular + 1 adherente + 1 contratada)

### Paso 1: Titular firma
- [ ] Firma completa
- [ ] `ddjj_salud` titular → `signed_pdf_url` no nulo
- [ ] `contrato` → `signed_pdf_url` sigue NULL ✅
- [ ] Contratada → `is_active = false` ✅ (falta adherente)
- [ ] No se envió WhatsApp a contratada todavía ✅

### Paso 2: Adherente firma
- [ ] Abre `/firmar/:token_adherente`
- [ ] Muestra solo su DDJJ ✅
- [ ] Firma completa
- [ ] `ddjj_salud` adherente → `signed_pdf_url` no nulo
- [ ] `contrato` → `signed_pdf_url` sigue NULL ✅
- [ ] Ahora sí contratada → `is_active = true` ✅
- [ ] WhatsApp enviado al representante ✅

### Paso 3: Contratada firma
- [ ] Abre `/firmar/:token_contratada`
- [ ] Muestra solo el contrato ✅
- [ ] Bloque de firma de la contratada tiene el nombre real del representante ✅
- [ ] Bloque del contratante (titular) también aparece correctamente ✅ (no duplicado)
- [ ] `contrato` → `signed_pdf_url` no nulo ✅
- [ ] PDF en Edge detecta firma ✅

---

## VALIDACIÓN DE REGLAS DE ORDEN (SAFETY)

- [ ] ❌ Contrato NO se firmó cuando firmó el titular
- [ ] ❌ Contrato NO se firmó cuando firmó el adherente
- [ ] ❌ Contratada NO se activó cuando faltaba el adherente
- [ ] ✅ Contrato SÍ se firmó cuando firmó la contratada
- [ ] ✅ Contratada SÍ se activó cuando terminó el último de paso 1
- [ ] ✅ Re-intentar firma no genera doble PDF (idempotencia)

---

## VALIDACIÓN DE DESCARGA

- [ ] Botón "Descargar PDF firmado" aparece después de firmado
- [ ] Llama a `get-document-download-url` (no usa `window.print()`)
- [ ] URL temporal funciona
- [ ] PDF no está corrupto
- [ ] Edge detecta firma digital

---

## VALIDACIÓN BACKOFFICE

- [ ] `SignatureWorkflow` muestra Card de **titular** ✅
- [ ] `SignatureWorkflow` muestra Card de **adherentes** ✅
- [ ] `SignatureWorkflow` muestra Card de **contratada** ✅ (fix nuevo)
- [ ] Link inactivo de contratada muestra "⏳ Se activa cuando..."
- [ ] Una vez completado muestra "✓ Completado"
- [ ] Muestra nombre del representante (no email) ✅

---

## CRITERIO DE ACEPTACIÓN FINAL

El sistema está listo para producción cuando:
- [ ] Prueba completa (Caso B) pasó sin errores
- [ ] Edge detecta firma en todos los PDFs firmados
- [ ] WhatsApp llegó con contenido correcto sin `{{variables}}` sin reemplazar
- [ ] Descarga usa signed URL (no print)
- [ ] No hay apikeys hardcodeadas en el frontend
- [ ] La lógica crítica no depende del navegador
- [ ] process_traces tiene registro de cada `finalize_signature_link`
