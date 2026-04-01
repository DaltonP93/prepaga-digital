
# Plan: Adherent Tab — Edit, Phone Required, Remove Documents Button

## File: `src/components/sale-form/SaleAdherentsTab.tsx` (full rewrite)

### Changes

**1. Remove Documents button and expansion**
- Remove `expandedDocIds` state, `toggleDocs` function
- Remove `BeneficiaryDocuments` import and `ChevronDown`/`ChevronUp` imports
- Remove the "Documentos" outline button and conditional `BeneficiaryDocuments` from each adherent card

**2. Make phone mandatory**
- Extract a shared `validateForm()` function that checks `first_name`, `last_name`, and `phone`
- If phone is empty, show toast: "El número de teléfono es obligatorio para el adherente"
- Applied to both add and edit flows

**3. Add inline edit for existing adherents**
- Extract form fields into a reusable `BeneficiaryForm` component (used by both add and edit)
- Add `editingId` and `editData` state
- Add a Pencil icon edit button next to the delete button on each card (visible when `!disabled`)
- Clicking edit replaces that card with the inline form pre-populated with the adherent's current data
- Save calls `updateBeneficiary.mutateAsync({ id, ...editData })`
- Cancel returns to card view
- Toasts on success: "Adherente agregado/actualizado/eliminado"

**4. Lock logic unchanged**
The existing `disabled` / `isAuditLocked` prop already allows editing until audit is approved (`audit_status === 'aprobado'`). No changes needed.

## Technical Details

Single file change. The `BeneficiaryForm` is a local component within the same file. The `useUpdateBeneficiary` hook is already imported but unused — it will now be used for the edit flow.
