

# Designer 2.0 — UX Overhaul & Legacy Migration

## Scope

8 improvements to make Designer 2.0 feel professional and resolve the Legacy→V2 empty canvas confusion.

## Changes

### 1. Legacy Migration Warning + Auto-Convert Button

**In `TemplateDesigner2.tsx`**: Accept new prop `legacyContent?: string` (passed from `TemplateForm`). When `blocks.length === 0 && legacyContent` is truthy, show a banner:

- Yellow alert: "Este template tiene contenido Legacy. El canvas V2 está vacío."
- Button: "Migrar contenido Legacy a bloques V2"

**Migration logic** (client-side, in a new `src/lib/legacyToBlocks.ts`):
- Parse HTML with DOMParser
- Map `<h1>`/`<h2>`/`<h3>` → `heading` blocks
- Map `<p>`, `<div>`, `<ul>`, `<ol>` → `text` blocks (keep raw HTML)
- Map `<table>` → `table` block
- Detect signature patterns (`Firma:`, `__`) → `signature_block`
- Detect `{{placeholders}}` → `placeholder_chip` blocks
- Each mapped element becomes a `createBlock.mutate()` call with incremental `sort_order`

**In `TemplateForm.tsx`**: Pass `legacyContent={watch("content")}` to `TemplateDesigner2`.

### 2. Compact Block Palette (Left Panel)

**Rewrite `BlockPalette.tsx`**:
- Use collapsible groups (default all open, remembers state)
- 2-column grid layout for block items (icon + short label, no description line)
- Reduce item height from ~40px to ~32px
- Remove the wrapping Card — use a plain sticky sidebar
- "Insertar Documento" button stays at top, smaller

### 3. Canvas Toolbar (Center Panel)

**In `TemplateDesigner2.tsx`**: Add a fixed toolbar bar above the canvas:
- Left: Badge "Designer 2.0" + block count
- Center: Zoom controls (75% / 100% / 125%) stored in state, applied as CSS `transform: scale()`
- Right: Field placement selectors (already exist, just relocate)
- Page indicator: "Página 1 de N"

### 4. Right Panel → Tabbed Layout

**Rewrite the right column in `TemplateDesigner2.tsx`**:
- Replace stacked `BlockPropertyPanel` + `FieldOverlay` + `VersionPanel` with `<Tabs>`:
  - **Propiedades** tab: `BlockPropertyPanel` (or empty state when no selection)
  - **Campos** tab: `FieldOverlay`
  - **Versiones** tab: `VersionPanel`

### 5. Smart Empty State (Right Panel — Properties Tab)

**In `BlockPropertyPanel.tsx`**: When `block === null`, instead of just "Seleccioná un bloque", show:
- Section "Acciones rápidas" with buttons: Add Text, Add Heading, Add Signature, Insert Document
- Section "Placeholders disponibles" listing common variables (`{{nombre_completo_cliente}}`, `{{documento_cliente}}`, etc.)
- Section "Tips" with 2-3 usage hints
- All actionable (clicking a quick action calls `onAddBlock`)

New prop: `onAddBlock?: (type: BlockType) => void`

### 6. Image Block — Upload/Library/URL

**In `BlockPropertyPanel.tsx`** for `case "image"`:
- Replace the plain URL input with 3 tabs/buttons:
  - **Subir archivo**: file input accepting `image/*`, uploads to storage via `upload-template-asset`, sets `asset_id` + `src`
  - **Biblioteca**: fetch existing image assets from `template_assets` where `mime_type LIKE 'image/%'`, show grid, click to select
  - **URL externa**: keep existing input as fallback
- Add properties: fit (contain/cover/fill), opacity slider (0-100), background toggle, caption input
- Show image preview when `src` is set, with "Reemplazar" and "Eliminar" buttons

### 7. Template Status Indicators

**In `TemplateDesigner2.tsx`** toolbar area, add status chips:
- If legacy content exists but no blocks: `⚠ Contenido Legacy no migrado`
- Block count: `N bloques`
- Published version from `VersionPanel` data: `v3 Publicada` or `Sin publicar`

**In `TemplateForm.tsx`** setup tab: show a small status card indicating:
- Current engine version
- Whether blocks exist (for 2.0)
- Whether legacy content exists
- Published version number

### 8. Visual Polish

Across all designer2 components:
- Use `text-[11px]` consistently for labels
- Tighter padding (`p-2` instead of `p-3` in palette items)
- Hover states with `transition-colors duration-150`
- Selected block ring uses `ring-primary/60` with subtle shadow
- Canvas background: subtle dot grid pattern via CSS
- Empty canvas: better illustration (centered icon + multi-line hint)
- Toolbar buttons: `h-7` height, consistent icon sizing

## Files

| File | Action |
|------|--------|
| `src/lib/legacyToBlocks.ts` | Create — HTML→blocks parser |
| `src/components/designer2/TemplateDesigner2.tsx` | Major rewrite — toolbar, tabs, migration banner, zoom |
| `src/components/designer2/BlockPalette.tsx` | Rewrite — compact 2-col, collapsible groups |
| `src/components/designer2/BlockPropertyPanel.tsx` | Rewrite — smart empty state, image upload flow |
| `src/components/TemplateForm.tsx` | Minor — pass `legacyContent` prop |

No backend or migration changes needed.

