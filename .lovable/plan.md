

# Fix: Image File Picker Closes Editor in Both V1 Legacy and V2

## Root Cause Analysis

There are **two separate bugs**, one per editor:

### Legacy V1 (TipTapEditor → ImageManager)
The `ImageManager` component renders its own `<input type="file">` inside a custom modal overlay (lines 488-499 of TipTapEditor.tsx), which itself lives inside the `TemplateForm.tsx` Radix `Dialog`. Although we already added `onFocusOutside` prevention to the Dialog, the `ImageManager` overlay is a `fixed inset-0` div with `z-50`. When the native file picker opens, the overlay's `bg-black/50` click-through or focus loss can cause `showImageManager` to reset. The `onFocusOutside` fix on the Dialog should already handle this — need to verify the ImageManager overlay isn't also closing on focus loss.

### V2 OpenSign (BlockPropertyPanel → ImageProperties)
The `<input type="file">` at line 543 of `BlockPropertyPanel.tsx` lives inside `ImageProperties`, which is rendered inside the right panel's `BlockPropertyPanel`. When the file picker opens:
1. Focus leaves the browser → the selected block can lose selection
2. If `selectedBlockId` becomes `null`, `BlockPropertyPanel` renders "no block selected" state → the `ImageProperties` component unmounts → the `<input>` disappears
3. The file picker returns with no handler → upload silently fails

This is the exact "component transitorio" pattern the user described.

## Plan

### 1. Move `<input type="file">` to stable level in `OpenSignTemplateEditor.tsx`

Add a hidden `<input ref={imageFileInputRef}>` at the editor root level, plus state for `pendingImageBlockId`. Provide a callback `onRequestPickImage` that:
- Stores `selectedBlockId` as `pendingImageBlockId`
- Triggers `imageFileInputRef.current?.click()`

On `onChange`, upload the file and update the pending block's `content.src`.

### 2. Thread `onRequestPickImage` through to `BlockPropertyPanel`

- Add `onRequestPickImage?: () => void` prop to `BlockPropertyPanel`
- Pass it into `ImageProperties` 
- Replace `fileRef.current?.click()` calls with `onRequestPickImage()` when provided
- Keep the local `fileRef` as fallback for standalone usage

### 3. Wire it in `OpenSignRightPanel`

- Add `onRequestPickImage?: () => void` to `OpenSignRightPanelProps`
- Pass it through to `BlockPropertyPanel`

### 4. Same pattern for `TemplateDesigner2.tsx` (old V2)

- Add the same stable input + pending block state
- Pass `onRequestPickImage` to its `BlockPropertyPanel`

### 5. Legacy V1 — verify ImageManager overlay

The `TipTapEditor.tsx` ImageManager overlay (lines 488-499) already has its own `<input>` inside `ImageManager`. Since the outer Dialog now has `onFocusOutside` prevention, this should work. If not, apply the same stable-input pattern to `TipTapEditor`.

### Files to modify

| File | Change |
|---|---|
| `src/components/designer2/opensign/OpenSignTemplateEditor.tsx` | Add stable `<input type="file">` + `pendingImageBlockId` state + `handleImageFileSelected` handler |
| `src/components/designer2/opensign/OpenSignRightPanel.tsx` | Add `onRequestPickImage` prop, pass to `BlockPropertyPanel` |
| `src/components/designer2/BlockPropertyPanel.tsx` | Add `onRequestPickImage` prop, use it in `ImageProperties` instead of local `fileRef.click()` |
| `src/components/designer2/TemplateDesigner2.tsx` | Same stable input pattern |

