

# Plan: Fix DDJJ Detection Bug + Normalize Unicode Comparisons

## Problem

The DDJJ document detection fails because some code paths use raw `.toLowerCase()` with literal accented characters (`'declaración'`) instead of the normalized comparison function `normalizeAccents()` that already exists. This causes encoding mismatches where `'declaración'.toLowerCase()` doesn't match `'declaracion'` (NFD-normalized).

## Files to Change

### 1. `src/components/sale-form/SaleTemplatesTab.tsx`

**A) Enhance `normalizeAccents` (line 24)** — add `.trim()` for safety:
```ts
const normalizeAccents = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
```

**B) Extract a reusable `isDDJJTemplate` helper** (new, after line 26):
```ts
const isDDJJTemplate = (template: any): boolean => {
  const norm = normalizeAccents(template.name || '');
  return norm.includes('declaracion') ||
    norm.includes('ddjj') ||
    template.template_type === 'ddjj_salud' ||
    template.document_type === 'ddjj_salud';
};
```

**C) Fix `handleRegenerateDocuments` sorting (lines 641-650)** — replace raw `.toLowerCase()` + `'declaración'` with `normalizeAccents()`:
```ts
const sortedTpls = [...(templateContents || [])].sort((a, b) => {
  const aNorm = normalizeAccents(a.name);
  const bNorm = normalizeAccents(b.name);
  const aIsAnexo = isAnexoPlanName(a.name) || (!isDDJJTemplate(a) && !aNorm.includes('contrato'));
  const bIsAnexo = isAnexoPlanName(b.name) || (!isDDJJTemplate(b) && !bNorm.includes('contrato'));
  ...
});
```

**D) Fix regenerate isDDJJ detection (lines 655-658)** — use the helper:
```ts
const isDDJJ = isDDJJTemplate(template);
```

**E) Fix regenerate ddjiTpls filter (lines 701-703)** — use the helper:
```ts
const ddjiTpls = (templateContents || []).filter(isDDJJTemplate);
```

### 2. `src/components/sale-form/SaleDDJJTab.tsx`

**Fix line 341-342** — the filter that finds DDJJ template IDs uses raw `.toLowerCase()` with `'declaración'`. Replace with normalized comparison:
```ts
const ddjjTemplateIds = (saleTemplateRows || [])
  .filter((row: any) => {
    const norm = (row.templates?.name || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    return norm.includes('ddjj') || norm.includes('declaracion');
  })
  ...
```

## What This Does NOT Change
- No visual/UX changes
- No database changes
- The `handleSendDocuments` path already uses `normalizeAccents()` correctly — no changes needed there
- The edge function `finalize-signature-link` compares `document_type === 'ddjj_salud'` (enum value, no accent issue) — no change needed

## Regarding "Regenerate All PDFs" Endpoint
The prompt mentions calling a `regenerate-all-pdfs` edge function. This function does **not exist** in the project. Creating and deploying a bulk regeneration endpoint is a separate task — this plan focuses solely on fixing the DDJJ detection bug so new sales work correctly going forward.

