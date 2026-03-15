

# Subfase 3A.1 — Hardening & Completeness Fixes

## Summary of Issues to Fix

6 concrete fixes to close Subfase 3A properly. No new tables or migrations needed.

## Changes

### 1. Storage convention: formalize `documents` bucket with `{company_id}/template-assets/` prefix

**Decision:** Keep using `documents` bucket (no new bucket). This matches existing RLS policies that enforce `{company_id}/` prefix. Creating a separate bucket would require duplicating RLS policies for no real benefit.

**Action:** No code change needed — already works this way. Document this as the official convention.

### 2. `process-template-asset`: clean up previous pages before re-inserting (idempotent reprocessing)

In `supabase/functions/process-template-asset/index.ts`, before inserting new `template_asset_pages`, delete any existing rows for this `asset_id`:

```sql
DELETE FROM template_asset_pages WHERE asset_id = $1
```

Also delete old preview PNGs from storage (list + remove files at `{company_id}/template-assets/{assetId}/previews/`).

### 3. `insert-template-asset-block`: reject if previews are missing

In `supabase/functions/insert-template-asset-block/index.ts`, for PDF assets: after loading `template_asset_pages`, check that **all selected pages** have a non-null `preview_image_url`. If any are missing, return 400 with clear message: `"Previews not ready yet. Please wait for thumbnail generation to complete."`

This prevents blocks with `preview_image_url: ""`.

### 4. Existing assets in library: show page selector instead of direct insert

In `AssetUploadModal.tsx`, change `handleSelectExistingAsset`:
- For ready PDFs: load `template_asset_pages` from DB, generate signed URLs for thumbnails, populate `pdfPages` state, go to `select_pages` step
- For images: insert directly (no pages to select)

### 5. `verify_jwt = false` rationale (no code change)

This is the correct pattern per Supabase's signing-keys system. `getClaims()` validates the JWT in code. All 3 functions already do this. No change needed — just confirming this is intentional and correct.

### 6. Subfase status: "closed as hybrid"

Thumbnail generation stays client-side (Deno cannot render PDF to images). Everything else is backend-driven. This is the correct architecture for this constraint.

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/process-template-asset/index.ts` | Add DELETE of old pages + old preview files before re-inserting |
| `supabase/functions/insert-template-asset-block/index.ts` | Reject PDF blocks when any selected page has null `preview_image_url` |
| `src/components/designer2/AssetUploadModal.tsx` | Library PDFs → load pages + show selector instead of direct insert |

