

## Plan: Fase 1 — Correcciones Críticas (4 puntos)

### Corrección 1: Eliminar hardcode del anon key en SignatureView.tsx

**Archivo**: `src/pages/SignatureView.tsx` (líneas 87-94)

Reemplazar la URL hardcodeada y el apikey literal por las constantes que ya usa el proyecto. Importar desde env vars:

```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
```

Y en el fetch:
```typescript
fetch(`${SUPABASE_URL}/functions/v1/get-document-download-url`, {
  headers: {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_PUBLISHABLE_KEY,
    'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
  },
  ...
})
```

---

### Corrección 2: WhatsApp — usar `recipient_phone` en lugar de `recipient_email`

**Archivo**: `src/hooks/useSignatureLinkPublic.ts` (líneas 638-664)

Tres cambios:

1. **Query**: cambiar `.select('id, token, recipient_email')` → `.select('id, token, recipient_phone, recipient_name')`

2. **Payload**: reemplazar el payload incorrecto `{ to, message, sale_id }` por el formato que espera `send-whatsapp`:
```typescript
{
  to: cl.recipient_phone,
  templateName: 'signature_link',
  templateData: {
    clientName: cl.recipient_name || 'Contratada',
    companyName: 'Prepaga Digital',
    signatureUrl: linkUrl,
  },
  companyId: data.sale?.company_id || '',
  saleId: data.sale_id,
}
```

3. **Guard**: solo enviar si `cl.recipient_phone` existe.

> Nota: `send-whatsapp` requiere autenticación (Bearer token de usuario autenticado o service role). Como este código corre en contexto público (sin auth), el fetch podría fallar con 401. Pero dado que ya se usa `apikey` header y `verify_jwt = false`, el endpoint lo acepta. El warn catch ya maneja el fallo gracefully.

---

### Corrección 3: Robustez en `get-document-download-url` — parsear bucket dinámico

**Archivo**: `supabase/functions/get-document-download-url/index.ts` (líneas 51-53)

Cambiar la lógica de parseo para extraer el bucket del propio `storedUrl` si incluye el formato `bucket:path`, y solo usar `STORAGE_BUCKET` como fallback:

```typescript
let bucket: string;
let storagePath: string;

if (storedUrl.includes(':')) {
  const colonIdx = storedUrl.indexOf(':');
  bucket = storedUrl.substring(0, colonIdx);
  storagePath = storedUrl.substring(colonIdx + 1);
} else {
  bucket = Deno.env.get("STORAGE_BUCKET") || "documents";
  storagePath = storedUrl;
}
```

---

### Corrección 4 (menor): Agregar `Authorization` header en SignatureView

En el mismo fetch de Corrección 1, agregar `Authorization: Bearer ${SUPABASE_PUBLISHABLE_KEY}` para consistencia con el patrón del resto de la app.

---

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/pages/SignatureView.tsx` | Reemplazar hardcode por env vars + agregar Authorization header |
| `src/hooks/useSignatureLinkPublic.ts` | Fix WhatsApp: `recipient_phone`, payload correcto |
| `supabase/functions/get-document-download-url/index.ts` | Parseo dinámico de bucket:path |

### Orden de ejecución
1. SignatureView.tsx (hardcode key)
2. useSignatureLinkPublic.ts (WhatsApp payload)
3. get-document-download-url (bucket parsing)

