# Agents.md — SAMAP Prepaga Digital

> **Instrucciones de comportamiento para agentes de IA (Claude, Lovable, Copilot, etc.)
> trabajando en este proyecto.**

---

## Reglas Absolutas (NUNCA violar)

### 🔴 NUNCA tocar `generate-base-pdf`

```
PROHIBIDO modificar: supabase/functions/generate-base-pdf/index.ts
PROHIBIDO redesplegar: en ningún deploy automático o manual desde este repo
PROHIBIDO incluir en: CI/CD, push hooks, o cualquier automatización
```

Esta función está administrada externamente. Tiene una implementación específica
que usa `<thead>/<tfoot>` HTML para repetir header/footer en PDFs.
La versión del repo ES INCOMPATIBLE con el renderer de producción.

Si necesitás modificar la generación de PDFs, consultar al administrador del sistema
antes de hacer cualquier cambio.

---

### 🔴 NUNCA guardar fechas con `new Date(dateString)` para fechas sin hora

```typescript
// ❌ MAL — introduce bug de timezone (off-by-1 day en Paraguay UTC-4)
const date = new Date("1981-05-09")
const iso = date.toISOString() // → "1981-05-08T20:00:00.000Z" en PY

// ✅ BIEN — guardar el string directamente del input
const dateInput = form.birth_date // → "1981-05-09"
await supabase.from('clients').insert({ birth_date: dateInput })
```

```typescript
// ❌ MAL — mostrar fecha con timezone
const display = new Date(record.birth_date).toLocaleDateString('es-PY')

// ✅ BIEN — parsear sin conversión
const [year, month, day] = record.birth_date.split('-')
const display = `${day}/${month}/${year}`
```

---

### 🔴 NUNCA crear beneficiarios con `relationship = 'Titular'`

El titular ya está referenciado en `sales.client_id`. Solo van en `beneficiaries`
las personas que son adherentes reales (cónyuge, hijo, padre, etc.).

Si se crea un beneficiario "titular", el sistema genera un signature_link de
adherente fantasma y el flujo de firmas queda roto.

---

### 🔴 NUNCA lowercasear el nombre del firmante

Al escribir el bloque de firma en `documents.content`:

```typescript
// ❌ MAL
const signerBlock = `Firmado electrónicamente por: <strong>${name.toLowerCase()}</strong>`

// ✅ BIEN — preservar capitalización original de la DB
const signerBlock = `Firmado electrónicamente por: <strong>${name}</strong>`
```

---

## Reglas de Comportamiento para Agentes

### Antes de hacer cualquier cambio

1. Leer `CLAUDE.md` para entender el contexto completo
2. Si el cambio afecta edge functions, verificar si es una de las administradas externamente
3. Si el cambio afecta RLS, verificar que no crea recursión infinita (ver nota abajo)
4. Si el cambio afecta la tabla `sales`, verificar que no rompe el flujo de firma

### Al modificar políticas RLS en `profiles`

```sql
-- ❌ MAL — genera recursión infinita
-- profiles RLS → subconsulta a sales → sales RLS → subconsulta a profiles → ♾️
CREATE POLICY "test" ON profiles FOR SELECT
USING (id IN (SELECT salesperson_id FROM sales WHERE ...));

-- ✅ BIEN — usar funciones SECURITY DEFINER que no pasan por RLS
CREATE POLICY "test" ON profiles FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));
```

### Al crear políticas RLS

Siempre verificar que incluyen todos los roles necesarios:
- `super_admin` — acceso total
- `admin` — su empresa
- `supervisor`, `auditor`, `gestor` — su empresa con restricciones
- `vendedor` — sus propias ventas/recursos

### Al modificar el flujo de firma

El orden de firma es estricto:
1. `step_order = 1`: titular + adherentes (en paralelo)
2. `step_order = 2`: contratada (se activa SOLO cuando todos del step 1 completaron)

El contrato (`document_type = 'contrato'`) se genera cuando firma la contratada.
Las DDJJ (`document_type = 'ddjj_salud'`) se generan cuando firma cada titular/adherente.

### Al modificar templates de documentos

- NO agregar campos de fecha automáticos que no estén en el template
- Los campos dinámicos usan sintaxis `{{variable.subvariable}}`
- El bloque de firma se inyecta automáticamente, no hardcodearlo en el template

### Al modificar la tabla `beneficiaries`

```typescript
// Al mostrar el teléfono del adherente
const phone = beneficiary.phone // ya viene sin el 0 inicial por trigger automático

// Al guardar teléfono (el trigger lo normaliza, pero igual enviarlo sin 0)
const phoneToSave = phone.replace(/^0+/, '')
```

---

## Flujo de Trabajo Recomendado para Agentes

### Para cambios en frontend (Lovable)

1. Hacer el cambio en el editor de Lovable
2. **NO** tocar nada en `supabase/functions/generate-base-pdf/`
3. Antes de hacer deploy, verificar que `generate-base-pdf` no está en los archivos modificados
4. Después del deploy, si los PDFs pierden el branding → avisar al administrador

### Para cambios en DB (migraciones)

1. Crear migración con nombre descriptivo en snake_case
2. Siempre usar `IF NOT EXISTS` / `IF EXISTS` para idempotencia
3. Para DDL usar `apply_migration`, para queries usar `execute_sql`
4. Después de crear/modificar tablas con RLS, correr `get_advisors(type='security')`

### Para cambios en edge functions

1. Verificar que la función NO está en la lista de administradas externamente
2. Hacer el cambio
3. Desplegar con `verify_jwt: false` para las funciones que lo requieren
4. Probar con un curl o desde la app

---

## Diagnóstico de Problemas Comunes

### PDFs sin encabezado/zócalo

**Causa**: Lovable sobreescribió `generate-base-pdf` con su versión que usa `displayHeaderFooter: true`.

**Diagnóstico**: Ver versión actual de la función. Si usa `displayHeaderFooter: true` → fue sobreescrita.

**Solución**: El administrador restaura la función v82 (estrategia `thead/tfoot`).

---

### La contratada no se activa automáticamente

**Causa**: Hay un signature_link de `adherente` con `status != 'completado'` que no debería existir (duplicado del titular).

**Diagnóstico**:
```sql
SELECT recipient_type, status, step_order
FROM signature_links
WHERE sale_id = '<id>'
ORDER BY step_order;
```

**Solución**: Revocar el link de adherente fantasma y activar manualmente el de contratada.

---

### Error 403 al aprobar venta (vendedor)

**Causa**: Falta política RLS en `sale_workflow_states` o `notifications` para el rol `vendedor`.

**Diagnóstico**: Ver policies de esas tablas y verificar que incluyen `vendedor`.

---

### Error 409 Conflict al eliminar venta

**Causa**: FK con `NO ACTION` que bloquea el cascade (ej: `hash_anchors → signature_evidence_bundles`).

**Solución**: Cambiar a `ON DELETE CASCADE`.

---

### Nombre del firmante en minúscula en el PDF

**Causa**: El frontend lowercasea el nombre antes de escribirlo en `documents.content`.

**Solución temporal**: `UPDATE documents SET content = REPLACE(content, 'nombre minuscula', 'Nombre Correcto')`.

**Solución permanente**: Fix en el frontend para preservar capitalización.

---

### WhatsApp no llega (OTP o link de firma)

**Causa más común**: El teléfono tiene el `0` inicial (`0984800303` en lugar de `984800303`).

**Diagnóstico**:
```sql
SELECT recipient_phone FROM signature_links WHERE id = '<id>';
```

**Solución**:
```sql
UPDATE signature_links
SET recipient_phone = REGEXP_REPLACE(recipient_phone, '^0+', '')
WHERE id = '<id>';
```

---

## Templates WhatsApp en la DB

Los templates se guardan en `whatsapp_templates` con estas claves:

| template_key | Uso |
|---|---|
| `signature_link` | Link de firma para titular/adherente |
| `contratada_signature_link` | Link de firma para la contratada |
| `contract_complete` | Notificación al titular cuando contratada firma |
| `otp_verification` | OTP para verificación |

Variables disponibles en templates: `{{clientName}}`, `{{companyName}}`, `{{signatureUrl}}`, `{{downloadUrl}}`, `{{contractNumber}}`, `{{expirationDate}}`

---

## Contactos del Proyecto

| Rol | Email |
|---|---|
| Super Admin | dalton9302@gmail.com |
| Super Admin | cacosta.ma@gmail.com |
| Admin SAMAP | admin.samap@hotmail.com |
| Representante Legal | eder.arguello@samap.com.py |
