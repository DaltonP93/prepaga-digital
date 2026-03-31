

## Auditoría Completa — Errores de Build + Seguridad

### A. Errores de Compilación (5 fixes)

**1. `src/pages/Companies.tsx` — Falta import `Plus`**
- Línea 7: agregar `Plus` al import de lucide-react.

**2. `src/components/sale-form/SaleTabbedForm.tsx` — Query a columna `role` inexistente en `profiles`**
- Línea 265: cambiar `.select('id, role')` → `.select('id')`.
- Líneas 288-290: eliminar el bloque `legacyProfileIds` que intenta leer `candidate.role` de profiles. Solo usar `userRoleIds` de la tabla `user_roles`.

**3. `src/components/designer2/AssetUploadModal.tsx` — Error tipo `File` constructor**
- Línea 203: agregar cast explícito: `new File([blob], \`page-${i}.png\`, { type: "image/png" }) as any as File` o usar variable intermedia tipada.

**4. `supabase/functions/generate-base-pdf/index.ts` — Tipo `SupabaseClient` incompatible**
- Líneas 207 y 263: cambiar `supabaseAdmin: ReturnType<typeof createClient>` → `supabaseAdmin: any` en ambas funciones (`resolveContentImages` y `resolveLogoUrl`).

**5. `supabase/config.toml` — Faltan todas las declaraciones de funciones**
- Agregar las 27 funciones con `verify_jwt = false` (api, cleanup-expired-signature-links, compose-template-pdf, create-payment, create-subscription, create-user, file-manager, finalize-signature-link, generate-base-pdf, generate-evidence-certificate, generate-evidence-pdf, generate-pdf, get-document-download-url, insert-template-asset-block, pades-sign-document, process-template-asset, publish-template-version, schedule-reminders, send-email-campaign, send-notification, send-sms-campaign, send-whatsapp, signature-otp, signwell-proxy, upload-template-asset, whatsapp-webhook).

---

### B. Problemas de Seguridad

**1. Bucket `incidents` es público** (riesgo medio)
- Contiene documentos de incidentes que pueden ser sensibles. Debería ser privado con URLs firmadas.
- **Fix**: migración SQL para cambiar `is_public` a `false`. Luego actualizar el frontend para usar URLs firmadas (o la función `get-document-download-url`).

**2. `signwell-proxy` usa `serve()` obsoleto**
- Línea 1: usa `serve` de `deno.land/std@0.168.0/http/server.ts` en vez de `Deno.serve()`. Funciona pero es API deprecated.
- Línea 5: le faltan headers CORS extendidos (`x-supabase-client-platform`, etc.).
- **Fix**: migrar a `Deno.serve()` y actualizar corsHeaders.

---

### C. Estado General — Sin Brechas Críticas

- ✅ RLS multi-tenant con `SECURITY DEFINER` — correcto
- ✅ Roles gestionados vía `user_roles`, no en `profiles` — correcto
- ✅ `profile.role` en frontend viene de `user_roles` vía `SimpleAuthProvider` — correcto
- ✅ `ProtectedComponent` es solo UX, no seguridad — documentado correctamente
- ✅ Edge Functions con auth guards (service role o JWT) — correcto
- ✅ DOMPurify para `dangerouslySetInnerHTML` — correcto
- ✅ Rate limiting en OTP — correcto
- ✅ HMAC en webhooks — correcto
- ✅ Prevención de escalación de privilegios en `user_roles` RLS — correcto

---

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/pages/Companies.tsx` | Agregar `Plus` al import |
| `src/components/sale-form/SaleTabbedForm.tsx` | Quitar `role` de query y eliminar fallback legacy |
| `src/components/designer2/AssetUploadModal.tsx` | Cast en `new File()` |
| `supabase/functions/generate-base-pdf/index.ts` | Tipo `any` en params |
| `supabase/config.toml` | Agregar 27 funciones |
| `supabase/functions/signwell-proxy/index.ts` | Migrar a `Deno.serve()` + CORS |

