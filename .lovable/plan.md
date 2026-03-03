

## Problema

Hay **dos errores encadenados**:

1. **"Error al actualizar la configuración API"** -- El `upsert` en `useCompanyApiConfiguration.ts` falla con `duplicate key value violates unique constraint "company_settings_company_id_key"`. Esto ocurre porque el upsert no especifica `onConflict: 'company_id'`, así que Supabase intenta hacer INSERT (no hay `id` en el payload) y choca con la constraint unique de `company_id`.

2. **"wa.me (manual) no puede enviar OTP automático"** -- Como el guardado falló en el paso anterior, la DB todavía tiene `whatsapp_provider = 'wame_fallback'`. Cuando el botón "Probar WhatsApp" llama a `signature-otp` con `action: test_whatsapp`, la edge function lee el provider de la DB (que sigue siendo `wame_fallback`) y devuelve ese error.

**Raíz**: todo se origina en que el upsert no funciona. Arreglar eso soluciona ambos errores.

---

## Plan de cambios

### 1. Arreglar el upsert en `useCompanyApiConfiguration.ts` (línea ~129-133)

Cambiar de:
```ts
.upsert(dbUpdates as any)
```
A:
```ts
.upsert(dbUpdates as any, { onConflict: 'company_id' })
```

Esto le indica a Supabase que cuando ya exista una fila con ese `company_id`, haga UPDATE en lugar de INSERT.

### 2. Mejorar el botón "Probar WhatsApp" en `AdminConfigPanel.tsx`

Actualmente llama `handleApiSave()` y espera 1 segundo con un `setTimeout`. Si el save falla (como ocurre ahora), el test procede con datos viejos. Mejora:

- Esperar la respuesta del save antes de testear (o al menos verificar que no hubo error).
- En la llamada `test_whatsapp`, no depender solamente de la DB: la edge function ya lee de DB, así que si el save funciona (con el fix del punto 1), todo fluye correctamente.

Estos son los únicos dos cambios necesarios. El fix principal es una sola línea.

