

## Plan: Complete Prompt 1 — Pass `companySettings` to remaining callers

### What's missing
Two files still call `createEnhancedTemplateContext` **without** the 8th `companySettings` parameter, meaning `{{representante_nombre}}` will fall back to the company name instead of the signer name in these contexts:

1. **`src/hooks/useEnhancedPDFGeneration.ts`** — used for local PDF preview generation
2. **`src/components/templates/LiveTemplatePreview.tsx`** — used for real-time template preview

### Changes

#### 1. `src/hooks/useEnhancedPDFGeneration.ts`
- Add `companySettings` to the `data` parameter type (optional field)
- Pass `data.companySettings` as the 8th argument to `createEnhancedTemplateContext`

#### 2. `src/components/templates/LiveTemplatePreview.tsx`
- Add `companySettings` to the `sampleData` prop or fetch it internally
- Pass it as the 8th argument to `createEnhancedTemplateContext`

### Impact
- Ensures `{{representante_nombre}}` and `{{representante_dni}}` resolve to the legal signer's data everywhere, not just in the sale templates tab
- No breaking changes — the parameter is already optional in the engine

