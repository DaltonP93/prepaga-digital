
## Objetivo
Que el OTP realmente se envíe por **WhatsApp** (cuando esté configurado) o haga **fallback visible** a **Email por SMTP** (sin Resend), y dejar el módulo **Integraciones** con pruebas (“Test”) antes de guardar. Además, que **Regenerar Documentos** produzca los mismos documentos correctos que “Enviar Documentos para Firma”.

---

## 1) Arreglar la causa real de “WhatsApp seleccionado pero muestra email y no llega nada”
**Hallazgos (de logs/DB):**
- `company_settings` para tu empresa **no tiene WhatsApp configurado** (`whatsapp_api_key`/`whatsapp_phone_id` null) → `signature-otp` cae a email.
- Email falla porque **RESEND_API_KEY inválida** y hoy el flujo OTP email depende de Resend cuando no hay SMTP real.
- Tu política OTP está en `allowed_channels: [whatsapp, smtp]` y `default_channel: smtp`, pero **SMTP “real” no está implementado** (la función avisa “no disponible”).

### 1.1 Migración DB (schema)
Crear una migración para completar lo que el panel de Integraciones ya asume y lo que OTP necesita:
- `company_settings`:
  - `whatsapp_provider text not null default 'wame_fallback'` (para persistir Meta/Twilio/QR)
  - `twilio_account_sid text null`
  - `twilio_auth_token text null`
  - `twilio_whatsapp_number text null`
- `company_otp_policy`:
  - `smtp_relay_url text null` (URL de un **gateway HTTP** que sí puede hablar SMTP; Supabase Edge no puede abrir sockets SMTP de forma confiable)

> Nota: Mantendremos `whatsapp_gateway_url` y `whatsapp_linked_phone` (ya existen) y los haremos operativos.

### 1.2 Refactor de `supabase/functions/signature-otp/index.ts`
Cambios funcionales:
- **Respetar el provider real** leyendo `company_settings.whatsapp_provider`:
  - `meta`: usar Graph API como ahora
  - `twilio`: enviar por Twilio (igual lógica que `send-whatsapp`)
  - `qr_session`: llamar al gateway HTTP configurado en `company_settings.whatsapp_gateway_url`
    - contrato mínimo: `POST {gateway}/send-otp` con `{ to, otp, companyId, saleId, signatureLinkId }`
    - opcional: `GET {gateway}/health`
  - `wame_fallback`: **NO permitido para OTP** (porque requiere acción manual; OTP debe ser automático). Responder error claro y activar fallback.
- **Email OTP “Solo SMTP”** (según tu respuesta):
  - Implementar envío por `smtp_relay_url` (HTTP) y **no usar Resend** cuando `email_provider='smtp'`.
  - Si no hay `smtp_relay_url`, devolver error “SMTP relay no configurado” (y no mentir con “enviado”).
- **Fallback visible** (según tu respuesta):
  - Respuesta del action `send` incluir:
    - `attempted_channel`
    - `channel_used`
    - `sent` (boolean real)
    - `fallback_used` (boolean)
    - `fallback_reason` (string)
    - `provider_used` (meta/twilio/qr_session/smtp_relay)
    - `destination_masked` del canal realmente usado

### 1.3 Ajustes frontend en OTP (firma pública)
Archivos:
- `src/hooks/useSignatureVerification.ts`
  - Consumir los nuevos campos (`fallback_used`, `fallback_reason`, `provider_used`, `sent`)
  - Si `sent=false`, mostrar error y no pasar a “awaiting_code”.
- `src/pages/SignatureView.tsx`
  - Mostrar UI clara:
    - “Solicitaste: WhatsApp”
    - “Se envió por: Email (SMTP) (fallback)” + razón
  - El toast y la máscara deben corresponder al `channel_used`, no al botón que el usuario tocó.

---

## 2) “Integraciones” usable: persistencia + botón de test antes de guardar
### 2.1 Persistencia real de providers/config
- `src/hooks/useCompanyApiConfiguration.ts`
  - Luego de la migración, mapear y guardar:
    - `whatsapp_provider`
    - `twilio_*`
  - Mantener el mapping existente para `whatsapp_api_key`, `whatsapp_phone_id`, `whatsapp_gateway_url`, `whatsapp_linked_phone`, `email_provider`, etc.

### 2.2 Botones “Probar” por canal
- `src/components/AdminConfigPanel.tsx`
  - WhatsApp:
    - Botón **“Enviar WhatsApp de prueba”** (a un número que el admin indique) usando `supabase.functions.invoke('send-whatsapp', ...)` con `templateName: 'general'`.
    - Si provider es `qr_session`, botón **“Probar gateway”** (health).
  - Email:
    - Si `email_provider='smtp'`, botón **“Probar envío SMTP (relay)”** llamando `signature-otp` action `test_email_smtp_relay` (nuevo), que envía un email real.
  - SMS:
    - Marcar explícitamente “No implementado / Requiere proveedor” o deshabilitar el canal OTP SMS hasta tener un edge function real (evitar falsa sensación de funcionamiento).

---

## 3) Regeneración de documentos: que sea consistente y no deje placeholders
**Problema actual:** `handleRegenerateDocuments()` no replica toda la lógica de `handleSendDocuments()` (por ejemplo, no arma `benResponsesMap` por beneficiario), y además no limpia documentos previos ⇒ quedan duplicados y/o versiones con `{{...}}`.

### 3.1 Unificar la lógica (paridad total)
- `src/components/sale-form/SaleTemplatesTab.tsx`
  - Extraer helpers reutilizables (misma extracción DDJJ desde `preexisting_conditions_detail`):
    - titular (primary)
    - adherente (por beneficiario)
  - En regeneración:
    - **Borrar o archivar** (soft-delete no existe hoy) todos los `documents` `generated_from_template=true` del `sale_id` antes de insertar nuevos (al menos los no firmados / no finales).
    - Regenerar:
      - Contrato (titular)
      - DDJJ titular
      - DDJJ por adherente
      - Anexos (evitando duplicidad con attachments como ya haces)
  - Validación post-render:
    - Si el HTML generado todavía contiene `{{`, registrar `process_traces` con la lista de placeholders detectados para debug rápido.

---

## 4) QA para cerrar “100% funcional” (lo que vamos a verificar)
(En este orden, porque hoy mismo está fallando la entrega OTP)
1. **OTP real (titular y adherente)**:
   - WhatsApp con provider configurado (Meta o QR gateway).
   - Si falla WhatsApp: fallback visible a Email SMTP (relay) y llega el mail.
2. **Integraciones**:
   - Guardar configuración sin errores.
   - Tests: WhatsApp test OK, SMTP relay test OK.
3. **Regeneración docs**:
   - Regenerar → abrir link titular y adherente → no ver `{{...}}` en contrato/DDJJ → anexos OK.

---

## Dependencias/decisiones que necesito para implementar bien (mínimas)
- Para “Solo SMTP”: confirmar/definir el endpoint del **SMTP relay HTTP** (o proveeremos un contrato estándar `/send-email` y `/health` para que tu equipo lo implemente).
- Para WhatsApp QR: confirmar que tu gateway puede exponer un endpoint HTTP (ej. WPPConnect/Baileys/whatsapp-web.js) para enviar mensajes sin interacción manual.
