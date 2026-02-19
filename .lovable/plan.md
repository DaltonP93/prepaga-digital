
# Fix: Template editor closing when configuring signature fields

## Problem
Clicking the gear icon on a signature field (or interacting with its Select dropdowns/Switches) inside the template editor causes the entire template dialog to close and navigate back to `/templates`. This happens because:

1. The `TemplateForm` wraps everything in a Radix `Dialog`
2. The signature field config uses Radix `Select` components that render in portals outside the Dialog DOM
3. TipTap's `ReactNodeViewRenderer` processes click events through ProseMirror, which Radix Dialog misinterprets as "outside" interactions
4. Even with `onPointerDownOutside` and `onInteractOutside` handlers, the event propagation path through TipTap bypasses these guards

## Solution

Refactor `TemplateForm` so it can render **without** the Dialog wrapper. The `TemplateEdit` page (full-page edit at `/templates/:id/edit`) does not need a Dialog at all -- it already has its own Layout. The Dialog is only needed when creating a new template from the Templates list page.

### Changes

**1. `src/components/TemplateForm.tsx`**
- Extract the form content (tabs, footer, etc.) into a separate inner component or conditional block
- When `open` is `true` AND no `template` prop is provided (new template mode), render inside a `Dialog`
- When `template` is provided (edit mode from full page), render the form content directly as a `Card` or plain `div`, without any Dialog wrapper
- Alternatively: accept a `mode` prop (`"dialog"` | `"inline"`) to control rendering. Default to `"dialog"` for backward compatibility

**2. `src/pages/TemplateEdit.tsx`**
- Pass `mode="inline"` (or similar) to `TemplateForm` so it renders without a Dialog
- Remove the `onOpenChange` navigation workaround since closing will be handled by the explicit "Volver" button already on the page

**3. `src/components/editor/SignatureFieldExtension.tsx`**
- As an extra safety measure, add `onPointerDown={(e) => e.stopPropagation()}` to the editing config panel container (`div` at line 377) to prevent any click events from leaking through TipTap's event system
- Add `onPointerDownOutside` handlers to each `SelectContent` to stop event propagation to parent layers

### Technical Details

```text
Current flow (broken):
  TemplateEdit -> TemplateForm (Dialog wrapper) -> TemplateDesigner -> TipTapEditor
    -> SignatureFieldComponent (NodeView) -> Settings click -> Select portal
    -> Dialog detects "outside" interaction -> closes -> navigates to /templates

Fixed flow:
  TemplateEdit -> TemplateForm (inline mode, NO Dialog) -> TemplateDesigner -> TipTapEditor
    -> SignatureFieldComponent (NodeView) -> Settings click -> Select portal
    -> No Dialog to interfere -> works correctly
```

### Why this approach?
- Eliminates the root cause entirely rather than patching symptoms
- The Dialog was never necessary for the full-page edit mode
- No risk of future regressions from Radix Dialog/Select/TipTap interactions
- The "new template" dialog flow remains unchanged
