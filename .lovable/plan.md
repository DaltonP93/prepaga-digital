

# Plan: Fix Designer V2 Freeze + Add Document Insertion

## Problem Analysis

**Freeze cause confirmed**: Line 189 in `OpenSignCanvas.tsx` has an inline ref callback that recreates on every render:
```tsx
ref={(el) => { containerRef.current = el; setDropRef(el); }}
```
This causes: render → ref callback → `setDropRef` state update → render → loop.

**Missing feature**: The OpenSign V2 editor has no "Insert Document" (PDF/DOCX upload) functionality. The `AssetUploadModal` component exists but is only wired into the old `TemplateDesigner2.tsx`, not into `OpenSignTemplateEditor.tsx`.

---

## Changes

### 1. Fix ref loop in `OpenSignCanvas.tsx`
- Replace inline ref callback (line 189) with a `useCallback`-memoized ref setter
- Dependencies: `[setDropRef]` only

### 2. Progressive mounting in `OpenSignTemplateEditor.tsx`
- Add a `mounted` state that starts `false`, flips to `true` after a `requestAnimationFrame` or short delay
- Wrap `DndContext` and `WidgetDragOverlay` so they only render after `mounted = true`
- This prevents DnD initialization from competing with initial layout

### 3. Lazy page URL resolution
- Change the `useEffect` that resolves signed URLs to only resolve `currentPage` instead of all pages at once
- Sidebar pages use raw `previewUrl` paths or a placeholder until explicitly needed

### 4. Add document insertion to OpenSign editor
- Add `AssetUploadModal` import and `showAssetModal` state to `OpenSignTemplateEditor.tsx`
- Pass `onInsertDocument` callback to `OpenSignRightPanel` or add a button in the toolbar/canvas area
- Add an "Insert Document" button in the right panel (Props tab or a new section) that opens `AssetUploadModal`

### Files to modify
| File | Change |
|---|---|
| `src/components/designer2/opensign/OpenSignCanvas.tsx` | Memoize ref callback with `useCallback` |
| `src/components/designer2/opensign/OpenSignTemplateEditor.tsx` | Progressive mount, lazy URL resolution, add `AssetUploadModal` |
| `src/components/designer2/opensign/OpenSignRightPanel.tsx` | Add "Insert Document" button (or pass through to canvas toolbar) |

