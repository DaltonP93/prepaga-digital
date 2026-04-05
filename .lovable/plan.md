

# Fix: Auditor Dashboard shows 0 in all stats and filters don't work

## Root Cause

The query fetches sales **filtered by `statusFilter`** (lines 171-183), but the stats (lines 507-512) are computed from that same already-filtered `sales` array. So when viewing "Pendientes", stats for Aprobados/Rechazados will always be 0, and vice versa.

Additionally, the `auditor_sales_view` excludes `status = 'borrador'` but approved sales have `status = 'aprobado_para_templates'` -- the "pending" filter only looks for `['pendiente', 'en_auditoria', 'enviado']`, which is correct, but the "aprobado" filter needs to also match `status = 'aprobado_para_templates'` or `'completado'` since approved sales move to those statuses.

## Solution

**File: `src/components/audit/AuditorDashboard.tsx`**

1. **Fetch ALL sales once** (remove server-side status filtering from the query). The view already scopes by company. Then filter client-side for both stats and the displayed list.

2. **Add a separate `useQuery` for stats** -- or simpler: fetch all sales with no status filter, compute stats from the full set, and filter `filteredSales` client-side by `statusFilter`.

### Concrete changes:

**Remove status filter from query** (lines 170-183): Remove the `if/else` block that applies `.in('status', ...)` and `.eq('audit_status', ...)`. Just fetch all sales from the view, ordered by date.

**Add client-side filtering** after the search filter (around line 495):

```typescript
// Classify each sale
const classifySale = (sale: any) => {
  if (sale.audit_status === 'aprobado') return 'aprobado';
  if (sale.audit_status === 'rechazado') return 'rechazado';
  if (sale.audit_status === 'requiere_info') return 'requiere_info';
  return 'pending'; // everything else is pending
};

// Stats from ALL sales
const stats = {
  pending: sales.filter(s => classifySale(s) === 'pending').length,
  approved: sales.filter(s => classifySale(s) === 'aprobado').length,
  rejected: sales.filter(s => classifySale(s) === 'rechazado').length,
  infoRequired: sales.filter(s => classifySale(s) === 'requiere_info').length,
};

// Filter for display
const filteredSales = sales
  .filter(sale => {
    if (statusFilter === 'pending') return classifySale(sale) === 'pending';
    if (statusFilter === 'aprobado') return classifySale(sale) === 'aprobado';
    if (statusFilter === 'rechazado') return classifySale(sale) === 'rechazado';
    if (statusFilter === 'requiere_info') return classifySale(sale) === 'requiere_info';
    return true; // 'all'
  })
  .filter(sale => { /* existing search filter */ });
```

**Update queryKey**: Remove `statusFilter` from queryKey since we fetch all now: `queryKey: ['auditor-sales']`.

**Make stat cards clickable**: Each stat card sets `statusFilter` on click so the user can click "Aprobados: 3" to see approved sales.

3 areas to edit, all in the same file. Stats will always reflect the real totals regardless of which filter tab is active.

