

# Fix: Template Editor Closes When Selecting Image File

## Root Cause

In `TemplateForm.tsx` (line 466-469), the `DialogContent` prevents `onPointerDownOutside` and `onInteractOutside`, but does **not** prevent `onFocusOutside`. When the "Seleccionar archivo" button in ImageManager triggers `inputRef.current?.click()`, the native OS file picker steals focus away from the browser. Radix Dialog interprets this focus loss as an "outside" interaction and fires `onOpenChange(false)`, closing the entire template editor.

This is a known Radix Dialog behavior with programmatic file input clicks.

## Fix

**File: `src/components/TemplateForm.tsx`** (1 line change)

Add `onFocusOutside={(e) => e.preventDefault()}` to the `DialogContent` props, alongside the existing `onPointerDownOutside` and `onInteractOutside` handlers.

That single addition prevents the Dialog from closing when focus moves to the native file picker, while preserving all other behavior.

