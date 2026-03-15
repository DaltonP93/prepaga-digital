

# Subfase 3B — Free Positioning & Drag/Resize for Designer 2.0

## Problem
The canvas currently uses `react-beautiful-dnd` for vertical list reordering only. All blocks stack sequentially. There's no click-to-place, free drag, or resize — the core interaction needed for a premium editor.

## Design Decision: Hybrid Layout
Two layout modes coexist on the same canvas:

- **Flow blocks** (vertical stack, keep current DnD reorder): `text`, `heading`, `table`, `page_break`
- **Positioned blocks** (absolute positioning, free drag + resize): `image`, `signature_block`, `placeholder_chip`, `attachment_card`, `pdf_embed`, `docx_embed`

Flow blocks render first in document order. Positioned blocks float above them using `position: absolute` with their `x/y/w/h` values (stored as percentages of the A4 page).

## Changes

### 1. `CanvasBlock.tsx` — Add drag & resize for positioned blocks

For positioned block types:
- Wrap in `position: absolute` container using `x/y/w/h` as percentage coordinates
- Implement mouse-based drag: `onMouseDown` captures offset → `onMouseMove` updates position → `onMouseUp` persists via `onUpdatePosition(x, y, w, h)`
- Add resize handles (bottom-right corner + right edge + bottom edge) that update `w/h`
- New prop: `onUpdatePosition: (x: number, y: number, w: number, h: number) => void`
- New prop: `isPositioned: boolean`
- Keep the existing flow rendering for non-positioned blocks unchanged

### 2. `TemplateDesigner2.tsx` — Split flow vs positioned blocks on canvas

Restructure the canvas area:
- The A4 page div gets `position: relative`
- Flow blocks render inside the existing `<DragDropContext>` vertical list (unchanged)
- Positioned blocks render as absolute-positioned `<CanvasBlock>` elements outside the DnD context, directly on the page
- `handleAddBlock` changes: for positioned types, set default `x: 10, y: 10, w: 30, h: 20` (percentages) instead of `0,0,100,0`

**Click-to-place mode:**
- New state: `insertMode: BlockType | null`
- When user clicks a positioned block type in the palette, instead of immediately creating it, set `insertMode`
- Canvas shows crosshair cursor + ghost preview following mouse
- On click inside the A4 page, create block at that position (converting mouse coords to percentage of page)
- Clear `insertMode` after placement
- For flow blocks, keep instant append behavior

**Position persistence:**
- On drag end or resize end, call `updateBlock.mutate({ id, x, y, w, h })`
- Coordinates stored as percentages (0-100) of A4 page dimensions

### 3. `BlockPalette.tsx` — Support insert mode

- New prop: `onStartInsertMode: (type: BlockType) => void`
- For positioned block types, clicking calls `onStartInsertMode(type)` instead of `onAddBlock(type)`
- For flow block types, keep calling `onAddBlock(type)` directly
- Visual indicator when insert mode is active (highlight the selected block type)

### 4. Positioned block types constant

Add to `TemplateDesigner2.tsx`:
```typescript
const POSITIONED_TYPES: Set<BlockType> = new Set([
  'image', 'signature_block', 'placeholder_chip', 
  'attachment_card', 'pdf_embed', 'docx_embed'
]);
```

### 5. Visual polish for positioned blocks

- Selection ring with drag cursor
- Resize handles: small squares at corners/edges, visible on hover/select
- Snap-to-grid: optional, round to nearest 1% increment
- Z-index controls via existing `z_index` field
- Ghost preview during insert mode: semi-transparent rectangle following cursor

## Files Modified

| File | Change |
|------|--------|
| `src/components/designer2/TemplateDesigner2.tsx` | Split flow/positioned rendering, insert mode, click-to-place, position update handler |
| `src/components/designer2/CanvasBlock.tsx` | Add drag/resize for positioned blocks, resize handles, new props |
| `src/components/designer2/BlockPalette.tsx` | Add `onStartInsertMode` prop, visual active state |

## What stays unchanged
- Legacy 1.0 engine
- Flow block DnD reordering
- `template_blocks` table schema (already has x/y/w/h columns)
- Field overlay system (`PageFieldOverlay`)
- Right panel tabs, version panel, property panel
- Migration banner

