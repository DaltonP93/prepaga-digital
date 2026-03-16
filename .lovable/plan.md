

# Fix: Image Upload Buttons Submit the Form, Closing the Editor

## Root Cause

The bug is **not** about Radix Dialog focus handling (that's already fixed). The real cause is simpler:

**HTML `<button>` elements default to `type="submit"` when inside a `<form>`.**

The `ImageManager` component has buttons ("Seleccionar archivo" at line 173 and "Insertar" at line 256) that do **not** specify `type="button"`. These buttons are rendered inside the `<form onSubmit={...}>` in `TemplateForm.tsx`. When clicked:

1. The button triggers `onClick` (opens file picker / inserts URL)
2. **Simultaneously**, the default `type="submit"` behavior fires `onSubmit`
3. `onSubmit` saves the template and calls `onOpenChange(false)` (line 184-185)
4. The Dialog closes → user lands on the templates list
5. The native file picker is still open but the handler component is gone

The shadcn `Button` component does not set `type="button"` — it spreads `...props` directly onto the native `<button>`, inheriting the HTML default of `type="submit"`.

## Fix

**File: `src/components/ImageManager.tsx`** — Add `type="button"` to all 3 buttons:

| Line | Button | Fix |
|------|--------|-----|
| 173 | "Seleccionar archivo" | Add `type="button"` |
| 256 | "Insertar" | Add `type="button"` |
| 213 (Eye) + 221 (Copy) | Image overlay buttons | Already `size="sm" variant="secondary"` — add `type="button"` for safety |

That's the complete fix. No architectural changes needed — the stable input ref and `onFocusOutside` prevention are already in place from previous work. This single attribute addition on 4 buttons stops the form submission that was closing the editor.

