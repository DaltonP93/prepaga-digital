

# Plan: Fixes pendientes — Firma, Auditoría, Precio y Botón "Firmar"

## Resumen de problemas detectados

1. **Prioridad 1 — Contratada name**: Ya está usando `get_contratada_info_by_token` RPC (línea 333-335 de `useSignatureLinkPublic.ts`). **Ya implementado correctamente.**

2. **Prioridad 2 — AuditorDashboard query rota**: `sale_documents (*)` en el select (línea 167) referencia una tabla inexistente, rompiendo silenciosamente el query.

3. **Prioridad 3 — isAuditLocked para auditor**: Ya usa `isSaleLocked` de `saleUtils.ts` que incluye `auditor`, `supervisor`, `gestor` como privilegiados. **Ya implementado.**

4. **Prioridad 4 — Modal cambio de estado**: Ya existe `ChangeStatusModal.tsx` integrado en `SaleTabbedForm.tsx` con `admin_change_sale_status` RPC. **Ya implementado.**

5. **Precio en auditoría**: Muestra `plans.price` (precio base del plan: 180.000) en vez del monto del titular. Debería mostrar el amount del beneficiario con `is_primary = true`.

6. **Botón "Firmar Todos los Documentos" no funciona**: `handleSignatureComplete` en `SignatureView.tsx` usa el cliente autenticado `supabase` (importado en línea 19) para insertar en `signature_events`, `signature_evidence_bundles` y `hash_anchors`. Como el firmante es anónimo (sin sesión auth), estos inserts fallan por RLS. El error se captura silenciosamente en el `catch` (línea 230-232), pero impide que se llegue a `submitSignature.mutateAsync` (línea 225).

## Cambios a implementar

### 1. `src/components/audit/AuditorDashboard.tsx` — Eliminar `sale_documents`
- **Línea 167**: Eliminar `sale_documents (*)` del select query
- **Líneas 774-858**: Eliminar/limpiar las referencias a `selectedSale.sale_documents` en el JSX (sección "Documentos Adjuntos")

### 2. `src/components/audit/AuditorDashboard.tsx` — Fix Precio Titular
- **Línea 581-582**: Cambiar `formatCurrency(Number(selectedSale.plans?.price || 0))` por el amount del beneficiario titular (`is_primary = true`)
- Buscar en `selectedSale.beneficiaries` el registro con `is_primary === true` y usar su `amount`
- Renombrar label a "Precio Titular" para claridad

### 3. `src/pages/SignatureView.tsx` — Fix botón "Firmar"
- En `handleSignatureComplete`, reemplazar el `supabase` client por un signature client con header `x-signature-token` (igual que hace `handleSaveConsent`)
- Usar `getSignatureClient(token)` o crear un cliente temporal con el header, para que los inserts en `signature_events`, `signature_evidence_bundles` y `hash_anchors` pasen RLS
- Alternativa: mover la lógica de evidencia al `useSubmitSignatureLink` hook que ya usa el signature client correcto

## Archivos a modificar
- `src/components/audit/AuditorDashboard.tsx` (eliminar `sale_documents`, fix precio)
- `src/pages/SignatureView.tsx` (fix cliente para inserts de evidencia)

