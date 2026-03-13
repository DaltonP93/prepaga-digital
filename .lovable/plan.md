

# Phase 3 -- Template Designer 2.0 Premium: Build Fix + Foundation

## Priority 1: Fix Build Errors (blocking everything)

### 1A. `send-whatsapp/index.ts` -- uninitialized variable
Line 84: `let message: string` must become `let message: string = ""`. This is unrelated to Designer 2.0 but blocks the build.

### 1B. Supabase types mismatch
The new tables (`template_assets`, `template_blocks`, `template_fields`, `template_asset_pages`, `incidents`, `incident_comments`, `incident_attachments`) exist in the database but are NOT in `src/integrations/supabase/types.ts`. This auto-generated file doesn't include them, causing TS errors when hooks try `.from('template_blocks')`.

**Fix**: All hooks already cast results with `as unknown as ...` and inserts with `as any`. The remaining issue is that the **table name string** isn't in the `Tables` union. Solution: add a type augmentation file `src/integrations/supabase/types-extension.d.ts` that extends the `Database` interface with the missing tables. This avoids editing the auto-generated file.

---

## Priority 2: Database Migration -- Extend `template_assets`

```sql
ALTER TABLE public.template_assets
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'uploaded',
  ADD COLUMN IF NOT EXISTS converted_asset_id uuid REFERENCES public.template_assets(id),
  ADD COLUMN IF NOT EXISTS processing_error text;
```

---

## Priority 3: Edge Function -- `compose-template-pdf`

This is the core backend piece. A single Edge Function that:
1. Loads `template_blocks` for a given template, ordered by page + sort_order
2. For HTML blocks (text, heading, signature_block, table): renders to HTML string
3. For `pdf_embed` blocks: fetches the original PDF from storage, extracts selected pages using `pdf-lib`
4. Merges everything in order into a single PDF
5. Loads `template_fields` and stamps them as annotations/form fields
6. Returns the final PDF

Uses `npm:pdf-lib` (works in Deno). Called by the existing `finalize-signature-link` when `template_designer_version === '2.0'`.

---

## Priority 4: Edge Function -- `publish-template-version`

Simple function:
- Unpublish all versions for template
- Set `is_published = true` on target version
- Update `templates.published_version_id`

---

## Priority 5: Frontend Polish (in same session)

### 5A. Disable `docx_embed` in BlockPalette
Add `disabled` flag + "Próximamente" badge. No fake feature.

### 5B. Fix PageFieldOverlay container sizing
Currently `containerWidth`/`containerHeight` are passed as 0 from CanvasBlock. Use `useRef` + `ResizeObserver` to get actual dimensions.

### 5C. BlockPalette DOCX disabled state
Gray out + tooltip "Requiere pipeline backend".

---

## What is deferred (future sessions)

- `upload-template-asset` and `process-template-asset` Edge Functions (current client-side pdf.js flow works for PDFs; backend needed only for DOCX conversion)
- DOCX-to-PDF conversion backend
- `render-template-preview` function
- Preview by role UI
- Placeholder integration with `template_placeholders`/`template_questions`
- Canvas resize handles, snap guides, multi-select
- Full version comparison/diff

---

## Files to create
- `src/integrations/supabase/types-extension.d.ts` -- type augmentation for missing tables
- `supabase/functions/compose-template-pdf/index.ts` -- PDF composition engine
- `supabase/functions/publish-template-version/index.ts` -- version publishing

## Files to modify
- `supabase/functions/send-whatsapp/index.ts` -- line 84: initialize `message`
- `src/components/designer2/BlockPalette.tsx` -- disable docx_embed
- `src/components/designer2/CanvasBlock.tsx` -- fix PageFieldOverlay container sizing
- `supabase/config.toml` -- register new edge functions

## Database migration
- Add `status`, `converted_asset_id`, `processing_error` to `template_assets`

