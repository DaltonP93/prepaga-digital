

# Plan: Implementar FIXes pendientes del prompt de auditoría

## Estado actual

| Fix | Estado | Detalle |
|-----|--------|---------|
| FIX 1 — Adherentes no guardan | ✅ Hecho | `useUpdateBeneficiary` funciona correctamente |
| FIX 2 — Helper `isSaleLocked` | ❌ Pendiente | No existe helper centralizado |
| FIX 3 — `disabled` prop correcto | ⚠️ Parcial | Solo `super_admin`/`admin` como privilegiados, falta `auditor`/`supervisor`/`gestor` |
| FIX 4 — Banner bloqueado | ❌ Pendiente | No hay banner de venta bloqueada |
| FIX 5 — Botón "Cambiar estado" | ❌ Pendiente | No existe modal ni integración con `admin_change_sale_status` |
| FIX 6 — Historial auditor con tabs | ⚠️ Parcial | `AuditorDashboard` ya filtra por `audit_status`, pero puede no mostrar todas las ventas |
| FIX 7 — Adherentes respetan disabled | ✅ Hecho | Botones edit/delete ocultos cuando `disabled=true` |
| FIX 8 — Templates: regenerar siempre | ❌ Pendiente | Regenerar/descargar se bloquea junto con la edición |

## Cambios a implementar

### 1. Crear helper `isSaleLocked` — nuevo archivo `src/lib/saleUtils.ts`
- Función que recibe `sale` y `userRole` y retorna `boolean`
- Roles privilegiados: `super_admin`, `admin`, `auditor`, `supervisor`, `gestor`
- Bloqueado si `audit_status === 'aprobado'` o `status` es `completado`/`aprobado_para_templates`

### 2. Usar `isSaleLocked` en `SaleTabbedForm.tsx`
- Reemplazar lógica inline de `isAuditLocked` con el helper centralizado
- Incluir todos los roles privilegiados

### 3. Banner de venta bloqueada en `SaleTabbedForm.tsx`
- Si `isLocked`, mostrar un banner con ícono de candado: "Venta aprobada — solo auditoría puede modificar"
- Ubicarlo arriba de las pestañas

### 4. Botón y modal "Cambiar estado" para admin/auditor
- En `SaleTabbedForm.tsx`, si el usuario es privilegiado, mostrar botón "Cambiar estado"
- Modal con: select de `status`, select de `audit_status`, textarea de motivo (obligatorio al revertir de aprobado)
- Llamar a `supabase.rpc('admin_change_sale_status', {...})`

### 5. Templates: separar regenerar/descargar de edición
- En `SaleTemplatesTab.tsx`, separar `canManageTemplates` (edición) de `canRegenerateDownload` (siempre true)
- Botones "Regenerar documento" y "Descargar" siempre habilitados independientemente del bloqueo

### 6. Verificar AuditorDashboard muestra todas las ventas
- Revisar que el filtro "all" no excluya ventas completadas/aprobadas

## Archivos a modificar
- `src/lib/saleUtils.ts` (nuevo)
- `src/components/sale-form/SaleTabbedForm.tsx`
- `src/components/sale-form/SaleTemplatesTab.tsx`
- `src/components/audit/AuditorDashboard.tsx` (si necesario)

