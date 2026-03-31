

# Auditoría Completa del Sistema — Resultados

## Estado General

El sistema tiene **74 tablas** con RLS habilitado en todas, **27 Edge Functions**, y la base de datos pasa el linter de Supabase sin errores. Sin embargo, se identificaron **3 vulnerabilidades activas** y varias áreas de mejora.

---

## PROBLEMAS CRÍTICOS (Requieren Acción)

### 1. Storage: Escritura cross-company en ruta `contracts/` (CRÍTICO)
**Problema**: Las políticas `documents_insert_own_company` y `documents_update_own_company` permiten que cualquier usuario autenticado suba archivos bajo la ruta `contracts/` sin validar que pertenezcan a su empresa. Un usuario de la Empresa A podría subir/sobrescribir PDFs de contratos de la Empresa B.

**Política actual de INSERT**:
```
(foldername[1] = company_id) OR (foldername[1] = 'contracts')  ← sin validar company
```

**Corrección**: Modificar INSERT y UPDATE para validar company_id en la sub-ruta de contracts (ej: `contracts/{company_id}/...`), o validar mediante join a la tabla `documents`/`sales` como ya se hace en SELECT.

### 2. Bucket `incidents` es público sin políticas de storage (CRÍTICO)
**Problema**: El bucket `incidents` está marcado como **público** (`public: true`) y **no tiene ninguna política RLS de storage**. Esto significa que cualquier persona con la URL puede leer los archivos, y cualquier usuario autenticado puede subir/eliminar archivos sin restricción.

Los archivos contienen adjuntos de incidentes (fotos, documentos) que son datos internos de la empresa.

**Corrección**: 
- Cambiar el bucket a privado
- Agregar políticas de storage con validación de `company_id`
- Actualizar el código para usar URLs firmadas en vez de `getPublicUrl()`

### 3. Realtime sin autorización de canales (ALTO)
**Problema**: No hay políticas RLS en `realtime.messages`, lo que permite que cualquier usuario autenticado se suscriba a cualquier canal Realtime. Hay **15 tablas publicadas** incluyendo `clients`, `sales`, `beneficiaries`, `profiles`, y `signature_links` — todas con datos PII sensibles.

Un vendedor de la Empresa A podría recibir en tiempo real los cambios de datos de la Empresa B.

**Nota**: Las consultas directas a las tablas SÍ están protegidas por RLS. El riesgo es que los eventos de Realtime transmiten los datos del cambio sin filtrar por empresa. La mitigación más práctica es:
- Remover tablas sensibles de la publicación Realtime que no necesitan estar ahí
- O agregar políticas a `realtime.messages` para filtrar por topic/company

---

## ADVERTENCIA (Riesgo Bajo)

### 4. View `company_settings_public` sin RLS directo
**Status**: Ya verificado como falso positivo en auditorías anteriores. Es una VIEW con `security_invoker=true` que hereda RLS de `company_settings`. No requiere acción.

---

## LO QUE ESTÁ BIEN ✓

| Área | Estado |
|------|--------|
| RLS en todas las tablas (74/74) | OK |
| Linter de Supabase | 0 issues |
| Edge Functions con auth guards | OK (verificado) |
| Aislamiento multi-tenant en tablas | OK (company_id + RLS) |
| Prevención de escalación de privilegios | OK |
| OTP con zero-knowledge hashing | OK |
| Rate limiting | OK |
| Bucket `documents` SELECT policy | OK (tenant-scoped) |
| Bucket `company-assets` público (solo branding) | OK |
| Function search_path hardening | OK |
| Audit logging con triggers | OK |
| Firma pública con token validation | OK |

---

## Plan de Corrección

### Migración 1: Corregir storage INSERT/UPDATE en `contracts/`
- DROP policies `documents_insert_own_company` y `documents_update_own_company`
- Recrearlas exigiendo que la ruta bajo `contracts/` incluya el `company_id` del usuario, o validando via join a `sales`

### Migración 2: Asegurar bucket `incidents`
- Cambiar bucket a privado (`UPDATE storage.buckets SET public = false WHERE name = 'incidents'`)
- Crear políticas SELECT, INSERT, DELETE que validen `company_id` en la ruta

### Cambio de código: Actualizar `useIncidents.ts`
- Reemplazar `getPublicUrl()` por `createSignedUrl()` para el bucket incidents (ya que dejará de ser público)
- Actualizar `IncidentAttachments.tsx` para usar URLs firmadas

### Migración 3: Reducir superficie de Realtime
- Remover tablas innecesarias de la publicación `supabase_realtime` (ej: `beneficiaries`, `signature_links`, `profiles` si no se necesitan en tiempo real)
- O agregar política RLS a `realtime.messages` filtrando por company

### Acción sobre `company_settings_public`
- Marcar como ignorado (ya es VIEW con security_invoker)

---

## Resumen de Severidad

| # | Hallazgo | Severidad | Acción |
|---|----------|-----------|--------|
| 1 | Storage contracts cross-company write | CRÍTICO | Migración SQL |
| 2 | Bucket incidents público sin RLS | CRÍTICO | Migración SQL + código |
| 3 | Realtime sin channel authorization | ALTO | Migración SQL |
| 4 | company_settings_public sin RLS | Info | Ignorar (es VIEW) |

