# CHECKLIST DEBUGGING TÉCNICO — PREPAGA DIGITAL
## Guía para aislar rápido dónde está el problema

---

## PASO 1 — IDENTIFICAR LA CAPA DEL FALLO

| Síntoma | Capa probable |
|---|---|
| El firmante no puede abrir el link | `signature_links` / token / `is_active` |
| OTP no llega | `send-whatsapp` / config empresa / teléfono |
| Firma completa pero no aparece PDF firmado | `finalize-signature-link` / `generate-base-pdf` / `pades-sign-document` |
| PDF existe pero Edge no detecta firma | `pades-signer` / PDF base corrupto |
| Descarga baja HTML en vez de PDF | `SignatureView` sigue usando `window.print()` |
| Contratada no se activa | Lógica estricta / adherentes pendientes / teléfono nulo |
| WhatsApp no llega | Plantilla DB / provider / payload / número |
| Bloques de firma duplicados | Regex / DOMParser en `useSignatureLinkPublic` |

---

## PASO 2 — VERIFICAR EL FRONTEND (LOVABLE)

### ¿El request llega al backend correcto?
- [ ] En Chrome DevTools → Network, buscar `finalize-signature-link`
- [ ] Debe ser POST con body `{ token, clientIp, userAgent }`
- [ ] Si responde 4xx/5xx, copiar el body de la respuesta

### ¿Hay apikeys hardcodeadas que rompan algo?
Buscar en el código:
```
'eyJhbGc      <- anon key hardcodeada
window.print() <- fallback que no debe ser el principal
generate-base-pdf  <- no debe llamarse directamente desde frontend
pades-sign-document  <- no debe llamarse directamente desde frontend
```

### ¿El token está disponible en el mutationFn?
- [ ] Verificar que `token` se pasa correctamente al llamar a `finalize-signature-link`
- [ ] No debe ser `undefined`

---

## PASO 3 — VERIFICAR SUPABASE EDGE FUNCTIONS

### Ver logs en tiempo real
Supabase → Edge Functions → (nombre) → Logs

**Logs importantes a verificar:**
- `finalize-signature-link` — debe mostrar `recipient_type`, `signed_documents`, `activated_contratada`
- `generate-base-pdf` — debe mostrar `document_id` y URL generada
- `pades-sign-document` — debe mostrar éxito o error del signer
- `send-whatsapp` — debe mostrar el `templateKey` y si encontró plantilla en DB

### Errores comunes en logs:

```
RENDER_URL or RENDER_KEY not configured
→ Agregar secrets en Supabase → Settings → Edge Functions → Secrets

PADES_URL or PADES_KEY not configured  
→ Idem

Invalid or expired token
→ El token expiró o no existe en signature_links

Link not active yet
→ is_active = false, el firmante anterior no terminó

No DB template found for key='...'
→ La plantilla no existe o is_active=false
→ Igual usa fallback hardcodeado, pero conviene cargarla en DB
```

---

## PASO 4 — VERIFICAR BASE DE DATOS

### signature_links para una venta
```sql
SELECT id, recipient_type, step_order, is_active, status,
       recipient_phone, completed_at, expires_at
FROM signature_links
WHERE sale_id = 'SALE_ID'
ORDER BY step_order, recipient_type;
```
**Chequeos:**
- [ ] Contratada tiene `recipient_phone` (sin esto no llega WhatsApp)
- [ ] Contratada inicia con `is_active = false`
- [ ] Contratada pasa a `is_active = true` después del último de paso 1

### Documentos para una venta
```sql
SELECT id, document_type, beneficiary_id, is_final,
       base_pdf_url, signed_pdf_url, status, signed_at
FROM documents
WHERE sale_id = 'SALE_ID' AND document_type != 'firma';
```
**Chequeos:**
- [ ] `is_final = true` para los docs que deben firmarse
- [ ] `signed_pdf_url` solo se llena cuando corresponde
- [ ] Contrato no tiene `signed_pdf_url` hasta que firma la contratada

### process_traces (auditoría)
```sql
SELECT action, details, created_at
FROM process_traces
WHERE sale_id = 'SALE_ID'
ORDER BY created_at DESC LIMIT 20;
```
- [ ] Debe aparecer `finalize_signature_link` para cada firma completada
- [ ] Los `details` muestran `signed_documents` y `activated_contratada`

### WhatsApp messages
```sql
SELECT phone_number, message_body, status, error_message, created_at
FROM whatsapp_messages
WHERE sale_id = 'SALE_ID'
ORDER BY created_at DESC LIMIT 10;
```
- [ ] `message_body` tiene el texto final renderizado (sin `{{variables}}`)
- [ ] `status` no es `failed`

---

## PASO 5 — VERIFICAR STORAGE

### Verificar archivos generados
En Supabase → Storage → documents → contracts/

```
contracts/
  base/
    {saleId}/
      {documentId}.pdf   ← debe existir después de generate-base-pdf
  signed/
    {saleId}/
      {documentId}.pdf   ← debe existir después de pades-sign-document
```

**Si falta `base/`:** problema en `generate-base-pdf` → revisar render service
**Si falta `signed/` pero existe `base/`:** problema en `pades-sign-document` → revisar pades-signer

---

## PASO 6 — VERIFICAR RENDER SERVICE

### Health check
```bash
curl -s https://prepaga.saa.com.py/render/health
# Esperado: {"ok":true}
```

### Test manual de render
```bash
curl -s -X POST https://prepaga.saa.com.py/render/pdf \
  -H "Content-Type: application/json" \
  -H "X-RENDER-KEY: TU_RENDER_KEY" \
  -d '{"html":"<html><body><h1>Test</h1></body></html>"}' \
  --output /tmp/test_base.pdf

ls -lh /tmp/test_base.pdf   # debe ser > 0 bytes
```

### Logs Docker
```bash
docker logs --tail=100 html2pdf
```

**Errores comunes:**
```
Playwright couldn't launch Chromium → reinstalar deps del contenedor
payload vacío / html undefined → revisar cómo se envía desde generate-base-pdf
Unauthorized → X-RENDER-KEY incorrecto
```

---

## PASO 7 — VERIFICAR PADES-SIGNER

### Health check
```bash
curl -s https://prepaga.saa.com.py/pades/health
# Esperado: {"ok":true}
```

### Test manual de firma
```bash
# Usar el PDF base generado en el paso anterior
curl -s -X POST https://prepaga.saa.com.py/pades/sign \
  -H "X-SIGN-KEY: TU_PADES_KEY" \
  -F "file=@/tmp/test_base.pdf" \
  --output /tmp/test_signed.pdf

ls -lh /tmp/test_signed.pdf  # debe ser >= tamaño del base
```

### Verificar que Edge detecta la firma
Abrir `/tmp/test_signed.pdf` en Microsoft Edge → debe mostrar "Firmado digitalmente"

### Logs Docker
```bash
docker logs --tail=100 pades-signer
```

**Errores comunes:**
```
P12 certificate not found → montar el archivo .p12 correctamente
Invalid password → revisar PADES_KEY
PDF malformed → el base_pdf está corrupto, revisar render
Unauthorized → X-SIGN-KEY incorrecto
```

---

## PASO 8 — VERIFICAR NGINX

### Test config
```bash
sudo nginx -t
# debe decir: syntax is ok / test is successful
```

### Verificar headers inyectados
```bash
# Ver que el reverse proxy pasa los headers secretos
grep -A5 "location /render" /etc/nginx/sites-enabled/*
grep -A5 "location /pades" /etc/nginx/sites-enabled/*
# Deben tener: proxy_set_header X-RENDER-KEY ... y proxy_set_header X-SIGN-KEY ...
```

### Logs
```bash
sudo tail -50 /var/log/nginx/error.log
sudo tail -20 /var/log/nginx/access.log
```

---

## CASOS DE FALLA ESPECÍFICOS

### Caso A — Contratada no se activa
1. ¿Hay adherentes pendientes?
   ```sql
   SELECT recipient_type, status FROM signature_links
   WHERE sale_id = 'SALE_ID' AND recipient_type IN ('titular','adherente');
   ```
2. ¿`finalize-signature-link` corrió para el último firmante? (ver process_traces)
3. ¿`recipient_phone` de contratada tiene valor?
4. ¿Los logs de `finalize-signature-link` dicen "Step 1 not completed yet"?

### Caso B — DDJJ no se firma PAdES
1. ¿`is_final = true` para ese documento?
2. ¿El `document_type = 'ddjj_salud'`?
3. ¿El `beneficiary_id` coincide con el `recipient_id` del link?
4. Ver logs de `finalize-signature-link`: ¿qué devuelve `signed_documents`?

### Caso C — Contrato se firmó antes de tiempo
1. Ver `process_traces`: ¿qué `recipient_type` disparó el PAdES del contrato?
2. ¿El filtro `docsToSign` en `finalize-signature-link` tiene el chequeo `document_type === 'contrato' && recipient_type === 'contratada'`?
3. ¿Hay código viejo en el frontend que aún llama a `pades-sign-document` directamente?

### Caso D — PDF firmado se descarga corrupto o vacío
1. ¿Existe el archivo en Storage `contracts/signed/{saleId}/{docId}.pdf`?
2. ¿`signed_pdf_url` en DB apunta al path correcto?
3. ¿`get-document-download-url` devuelve URL válida?
4. ¿La signed URL expiró? (duración 1 hora)

### Caso E — Bloque de firma duplicado en PDF
1. ¿El código usa DOMParser o sigue usando el regex viejo?
2. ¿Los divs de firma tienen `data-signer="titular"` y `data-signer="contratada"`?
3. ¿El delete previo de `is_final=true` borra más de lo esperado?

---

## COMANDOS RÁPIDOS

```bash
# Estado servicios Docker
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Logs de cada servicio
docker logs --tail=100 html2pdf
docker logs --tail=100 pades-signer

# Health checks
curl -s https://prepaga.saa.com.py/render/health
curl -s https://prepaga.saa.com.py/pades/health

# Nginx
sudo nginx -t
sudo tail -20 /var/log/nginx/error.log
```

---

## ORDEN DE DEBUG RECOMENDADO

Cuando algo falle, revisar en este orden:

```
1. Frontend hizo el request correcto?
   → DevTools → Network → ver el POST a finalize-signature-link

2. Edge Function corrió y logueó?
   → Supabase → Edge Functions → Logs

3. La DB tenía los datos esperados?
   → SQL queries de signature_links y documents

4. Storage recibió el archivo?
   → Supabase → Storage → contracts/base y contracts/signed

5. html2pdf respondió correctamente?
   → docker logs html2pdf

6. pades-signer respondió correctamente?
   → docker logs pades-signer

7. WhatsApp / plantilla / provider?
   → whatsapp_messages table + logs de send-whatsapp
```
