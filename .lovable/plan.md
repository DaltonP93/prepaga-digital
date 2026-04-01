
# Plan: Adherent Tab — Edit, Phone Required, Remove Documents Button

## File: `src/components/sale-form/SaleAdherentsTab.tsx`

### 1. Make phone mandatory
Update `handleAdd` validation: require `phone` alongside `first_name`/`last_name`. Show toast error "Nombre, apellido y teléfono son obligatorios" if missing.

### 2. Remove "Documentos" button and expansion
- Remove `expandedDocIds` state, `toggleDocs` function
- Remove `BeneficiaryDocuments` import, `ChevronDown`/`ChevronUp` imports
- Remove the "Documentos" outline button and the conditional `BeneficiaryDocuments` rendering from each adherent card

### 3. Add inline edit for each adherent
- Add `editingId` state and `editData` state (same shape as `newBeneficiary`)
- Add `Pencil` icon import from lucide-react
- Add an "Edit" button (Pencil icon) next to the delete button on each card (visible when `!disabled`)
- When clicked, replace that card with the same form fields (extracted into a shared `BeneficiaryForm` component) pre-populated with the adherent's data
- Save calls `updateBeneficiary.mutateAsync({ id: editingId, ...editData })`
- Edit form also validates phone is required before saving
- Cancel button returns to card view

### 4. No change to lock logic
The existing `disabled` / `isAuditLocked` logic already allows editing until audit is approved — no changes needed there.

## Summary of UI Changes
- Each adherent card shows: name, details, [Edit pencil] [Delete trash] (no Documents button)
- Clicking Edit opens inline form in place of the card
- Adding/editing requires phone field filled
