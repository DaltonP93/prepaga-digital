

# Fix: Auditor Dashboard query failing silently

## Root cause

The Supabase select string on line 166 has a **trailing comma** after `documents (*)`:

```
select(`
  *,
  clients (*),
  plans (*),
  beneficiaries (*),
  documents (*),     <-- trailing comma causes PostgREST 400 error
`)
```

PostgREST parses this and expects another column after the comma. When it finds only whitespace, it returns a **400 Bad Request**. The `queryFn` throws (line 189: `if (error) throw error`), react-query catches it, and the component falls back to the default `sales = []`, showing "0 Pendientes" and "No hay ventas".

I verified in the database: sale `2026-000049` has `status: 'pendiente'` and `audit_status: 'pendiente'` — the filters are correct. There are also 3 other sales (`borrador`) that should appear. The data is there; the query is just failing.

## Fix

**File: `src/components/audit/AuditorDashboard.tsx`** (line 166)

Remove the trailing comma from the select string:

```typescript
// BEFORE:
.select(`
  *,
  clients (*),
  plans (*),
  beneficiaries (*),
  documents (*),
`)

// AFTER:
.select(`
  *,
  clients (*),
  plans (*),
  beneficiaries (*),
  documents (*)
`)
```

Single character change. This will unblock the entire audit dashboard.

