

# Subfase 3A — Backend Real de Assets PDF

## Current State Analysis

**What exists:**
- `template_assets` table with `status`, `processing_error`, `converted_asset_id` columns
- `template_asset_pages` table with `asset_id`, `page_number`, `preview_image_url`, `width`, `height`
- `template_blocks` table with JSON `content` column
- RLS policies on all three tables (company-scoped via template→profiles join)
- `documents` bucket (private) with RLS requiring `{company_id}/` prefix on paths
- Frontend `AssetUploadModal` doing everything: direct storage upload, pdf.js rendering, direct DB inserts, block creation via `onAssetInserted` callback
- `compose-template-pdf` already reads `file_url` from `template_assets`

**Problems to fix:**
1. Frontend uploads directly to storage with path `template-assets/{templateId}/...` — violates `documents` bucket RLS (requires `{company_id}/` prefix)
2. Frontend creates asset rows, asset page rows, AND blocks — triple frontend-driven creation
3. `page_previews` in `pdf_embed` blocks can have `preview_image_url: ""` (fake)
4. No `status` lifecycle (`uploaded` → `processing` → `ready`)
5. Block creation duplicated: `AssetUploadModal` passes data to `TemplateDesigner2.handleAssetInserted` which creates the block

## Key Technical Constraint

Deno edge functions **cannot render PDF pages to images** (no Canvas API, no pdf.js rendering). The thumbnail rendering must remain client-side (pdf.js + canvas). However, all other operations (upload, metadata extraction, page row persistence, block creation) move to edge functions.

**Hybrid flow:**
1. Edge function: upload file + create asset row
2. Edge function: extract page count/dimensions via pdf-lib, create `template_asset_pages` rows
3. Frontend: render thumbnails via pdf.js, upload PNGs to standardized paths, update page rows
4. Edge function: create block with real `page_previews` from DB

## Storage Convention

Use existing `documents` bucket. Paths follow the existing RLS convention:

```text
{company_id}/template-assets/{assetId}/original.pdf
{company_id}/template-assets/{assetId}/previews/page-1.png
{company_id}/template-assets/{assetId}/previews/page-2.png
```

`template_assets.file_url` stores the internal storage path. No `getPublicUrl()`. Signed URLs only for frontend preview.

## Implementation

### 1. Edge Function: `upload-template-asset`

**Input:** `{ template_id, file_name, mime_type, file_base64 }`

**Flow:**
- Validate auth via `getClaims()`
- Load template, verify user belongs to same company
- Validate MIME (`application/pdf`, `image/png`, `image/jpeg`, `image/webp`)
- Reject DOCX with clear message: "DOCX no soportado en esta subfase"
- Generate `asset_id` (uuid)
- Decode base64, upload to `{company_id}/template-assets/{assetId}/original.{ext}`
- Insert `template_assets` row with `status='uploaded'`
- Return created asset

### 2. Edge Function: `process-template-asset`

**Input:** `{ asset_id }`

**Flow:**
- Validate auth + company access
- Set `status='processing'`
- Download original PDF from storage
- Use pdf-lib to get `pageCount` and per-page dimensions
- Insert `template_asset_pages` rows with `width`, `height`, `preview_image_url = null` (to be filled by frontend thumbnail upload)
- Update asset: `page_count`, `status='ready'`
- On error: `status='failed'`, `processing_error = message`
- For images: set `status='ready'` immediately (no page processing needed)
- For DOCX: return error "not supported in this phase"

### 3. Frontend Thumbnail Upload (in `AssetUploadModal`)

After `process-template-asset` returns `status='ready'`:
- Frontend renders thumbnails via pdf.js (existing working code)
- Uploads PNGs to `{company_id}/template-assets/{assetId}/previews/page-{n}.png` via storage SDK
- Updates each `template_asset_pages` row with `preview_image_url` = storage path
- Shows page selector with real thumbnails

This is the only step that stays client-side (due to canvas requirement).

### 4. Edge Function: `insert-template-asset-block`

**Input:** `{ template_id, asset_id, selected_pages }`

**Flow:**
- Validate auth + company access
- Load asset, verify `status='ready'` for PDFs
- Load `template_asset_pages` for this asset
- Build real `page_previews` array from DB rows (with signed URLs for preview_image_url)
- Determine `block_type`: pdf → `pdf_embed`, image → `image`, other → `attachment_card`
- Calculate `sort_order` (max existing + 1)
- Insert single `template_blocks` row with real content
- Return created block

**pdf_embed content:**
```json
{
  "kind": "pdf_embed",
  "asset_id": "...",
  "source_type": "pdf",
  "display_mode": "embedded_pages",
  "page_selection": { "mode": "specific", "pages": [1, 2, 3] },
  "render_mode": "preview_image",
  "final_output_mode": "merge_original_pdf_pages",
  "page_previews": [
    { "page_number": 1, "preview_image_url": "{company_id}/template-assets/...", "width": 595, "height": 842 }
  ],
  "allow_overlay_fields": true,
  "replaceable": true
}
```

### 5. Frontend: Rewrite `AssetUploadModal`

Replace current flow with:
1. File drop → convert to base64 → call `upload-template-asset`
2. Call `process-template-asset`
3. Render thumbnails client-side (pdf.js), upload PNGs to storage, update `template_asset_pages`
4. Load `template_asset_pages` → show page selector with real thumbnails
5. User selects pages → call `insert-template-asset-block`
6. `onAssetInserted` callback now only receives the created block (no more triple creation)

**Remove from frontend:**
- Direct `createAsset.mutateAsync()` call
- Direct `bulkCreatePages.mutateAsync()` call
- `generatePdfPreviews` building asset page inserts
- Block creation in `TemplateDesigner2.handleAssetInserted`

### 6. Update `TemplateDesigner2`

Simplify `handleAssetInserted`: the block is already created by the edge function, so this callback just needs to refresh the blocks query and select the new block. No more client-side `createBlock.mutate()` for assets.

### 7. Config

Add to `supabase/config.toml`:
```toml
[functions.upload-template-asset]
verify_jwt = false

[functions.process-template-asset]
verify_jwt = false

[functions.insert-template-asset-block]
verify_jwt = false
```

All three validate JWT in code via `getClaims()`.

### 8. DOCX

Keep `docx_embed` in type definitions but show "Próximamente" in UI. Edge functions reject DOCX MIME with clear error.

## Files Created/Modified

| File | Action |
|------|--------|
| `supabase/functions/upload-template-asset/index.ts` | Create |
| `supabase/functions/process-template-asset/index.ts` | Create |
| `supabase/functions/insert-template-asset-block/index.ts` | Create |
| `supabase/config.toml` | Add 3 function configs |
| `src/components/designer2/AssetUploadModal.tsx` | Rewrite to backend-driven flow |
| `src/components/designer2/TemplateDesigner2.tsx` | Simplify `handleAssetInserted` |
| `src/types/templateDesigner.ts` | Add `status` to `TemplateAsset` interface |

No new migrations needed — tables and columns already exist.

