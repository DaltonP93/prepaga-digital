
# Plan: Adherent Tab Improvements

## Changes in `src/components/sale-form/SaleAdherentsTab.tsx`

### 1. Make phone mandatory on save
Update `handleAdd` validation to require `phone`:
```typescript
if (!newBeneficiary.first_name || !newBeneficiary.last_name || !newBeneficiary.phone) {
  toast.error('Nombre, apellido y teléfono son obligatorios');
  return;
}
```

### 2. Remove "Documentos" button from each adherent card
Remove the `toggleDocs` function, `expandedDocIds` state, the "Documentos" button, and the `BeneficiaryDocuments` expansion section. Remove the `ChevronDown`/`ChevronUp` imports and `BeneficiaryDocuments` import.

### 3. Add inline edit capability for existing adherents
Add an "Editar" button (Pencil icon) on each adherent card. Clicking it opens an inline edit form (same fields as the add form) pre-populated with the adherent's data. Save calls `updateBeneficiary.mutateAsync`. Edit also requires phone to be filled.

### 4. Editing allowed until audit approval (already works)
The current `disabled` prop is driven by `isAuditLocked` which locks when `audit_status === 'aprobado'`. This already allows editing before approval. No change needed for this logic — the `disabled` prop correctly controls add/delete/edit visibility.

## Files Modified
- `src/components/sale-form/SaleAdherentsTab.tsx`
