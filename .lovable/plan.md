

## Plan: Aplicar 3 Fixes Urgentes

Tras revisar el código actual, **FIX 3 (SignatureWorkflow.tsx) ya está completamente implementado**. Solo quedan pendientes FIX 1 y FIX 2.

### FIX 1 — ContratadaSignatureConfig.tsx (5 cambios)

Agregar soporte para el campo `contratada_signer_phone`:

1. **Estado**: Agregar `const [signerPhone, setSignerPhone] = useState('')` después de `signerDni`
2. **Select**: Agregar `contratada_signer_phone` al `.select()` en `loadConfig`
3. **Load**: Agregar `setSignerPhone(data.contratada_signer_phone || '')` en `loadConfig`
4. **Save**: Agregar `contratada_signer_phone: signerPhone || null` en `handleSave`
5. **JSX**: Cambiar el grid de 3 columnas a 2 columnas, agregar input de teléfono con prefijo `+595` y nota explicativa

### FIX 2 — useCreateAllSignatureLinks.ts (2 cambios)

1. **Select** (linea 36): Agregar `contratada_signer_phone` al `.select()` de `company_settings`
2. **Insert** (linea 129): Cambiar `recipient_phone: null` a `recipient_phone: companySettings.contratada_signer_phone || null`

### FIX 3 — SignatureWorkflow.tsx — YA APLICADO

Todos los cambios (Building import, getRecipientLabel, getRecipientPhone, getRecipientName, getActiveLinks, contratadaLinks filter, Card de contratada) ya existen en el código actual.

### Nota
La migración SQL (`ALTER TABLE company_settings ADD COLUMN contratada_signer_phone TEXT`) ya fue aplicada en Supabase segun el documento.

