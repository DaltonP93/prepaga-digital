

## Plan: Fix `border_radius` error + Move "Firma Contratada" into AdminConfigPanel tabs

### Problem 1: `border_radius` column missing
The `useBranding.ts` hook tries to read/write `border_radius`, `dark_mode`, `font_family`, `shadows` columns on the `companies` table, but these columns don't exist in the database. Need to add them via migration.

### Problem 2: "Firma Contratada" as a tab inside AdminConfigPanel
Currently `ContratadaSignatureConfig` is a separate Card below `AdminConfigPanel` in Settings. The user wants it as a new tab inside `AdminConfigPanel`, next to "Firma Digital".

---

### Changes

**1. Database migration** — Add missing branding columns to `companies` table:
```sql
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS border_radius text,
  ADD COLUMN IF NOT EXISTS dark_mode boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS font_family text,
  ADD COLUMN IF NOT EXISTS shadows boolean DEFAULT true;

NOTIFY pgrst, 'reload schema';
```

**2. `src/components/AdminConfigPanel.tsx`**:
- Change `grid-cols-5` to `grid-cols-6` in the TabsList
- Add a new `TabsTrigger` for "Firma Contratada" with `PenTool` icon
- Add a new `TabsContent` that renders `<ContratadaSignatureConfig />` (without the outer Card wrapper, since AdminConfigPanel already provides structure)
- Import `ContratadaSignatureConfig`

**3. `src/components/ContratadaSignatureConfig.tsx`**:
- Export an alternative "inner" version (without Card wrapper) or add a prop `embedded` that skips the Card wrapper, so it fits inside the AdminConfigPanel tab cleanly.

**4. `src/pages/Settings.tsx`**:
- Remove the standalone `<ContratadaSignatureConfig />` from the Integraciones tab (it will now live inside AdminConfigPanel).

