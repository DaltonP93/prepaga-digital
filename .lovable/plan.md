

## Separar configuración OTP WhatsApp de firma WhatsApp

### Problema
El toggle "Usar Sesión QR para OTP" en el panel de Canales OTP lee/escribe `company_settings.whatsapp_provider`, que es la misma columna que controla el proveedor de firma en la pestaña WhatsApp. Cambiar uno pisa al otro.

### Solución
La DB ya tiene columnas separadas en `company_otp_policy`: `otp_whatsapp_provider`, `otp_whatsapp_gateway_url`, `otp_use_signature_whatsapp`. El panel OTP debe usar estas columnas en lugar de `company_settings.whatsapp_provider`.

**No se requiere migración de DB** -- las columnas ya existen.

### Cambios

**1. `src/hooks/useOtpPolicy.ts`**
- Agregar 3 campos al interface `OtpPolicyConfig`: `otp_whatsapp_provider`, `otp_whatsapp_gateway_url`, `otp_use_signature_whatsapp`
- Agregar defaults: `'qr_session'`, `''`, `true`
- Mapear los campos en `queryFn`

**2. `src/components/OtpPolicyConfigPanel.tsx`**
- Toggle "Usar Sesión QR": cambiar de `apiFormData.whatsapp_provider` a `formData.otp_whatsapp_provider`
- Campo URL Gateway: cambiar de `apiFormData.whatsapp_gateway_url` a `formData.otp_whatsapp_gateway_url`
- Condición de visibilidad del bloque QR: usar `formData.otp_whatsapp_provider === 'qr_session'`
- Validación en `handleSave`: usar `formData.otp_whatsapp_provider` en vez de `apiFormData.whatsapp_provider`
- `handleSave`: eliminar la llamada a `updateConfigurationAsync` (ya no toca `company_settings`)
- `handleTestWhatsapp`: guardar `otp_whatsapp_provider` y `otp_whatsapp_gateway_url` via `updatePolicyAsync` en vez de `updateConfigurationAsync`
- Botón de prueba: condición disabled usa `formData.otp_whatsapp_gateway_url` en vez de `apiFormData.whatsapp_gateway_url`

### Resultado
- Pestaña **WhatsApp** controla solo cómo se envían links de firma
- Pestaña **Canales OTP** controla solo cómo se envían códigos OTP
- Se puede tener wa.me para firma + WAHA para OTP sin conflicto

