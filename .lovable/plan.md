
# Plan: Fix Template Signature Saving, Public Signature View, and UX Improvements

This plan addresses 4 distinct issues reported by the user.

---

## Issue 1: Signature field configuration not persisting when saving the template

**Root Cause**: The TipTap editor serializes the signature field to HTML via `renderHTML()` in the `SignatureFieldExtension`. When saving, `editor.getHTML()` produces the HTML output -- but the signature field attributes (like `signatureType`, `width`, `height`, `float`) are encoded as `data-*` attributes and inline styles. When the template is reloaded, `parseHTML()` only matches `div[data-signature-field]` but does NOT extract those attributes back. TipTap's `parseHTML` needs explicit `getAttrs` to read them from the DOM.

**Fix**: Add a `getAttrs` function to `parseHTML()` in `SignatureFieldExtension.tsx` that reads all `data-*` attributes and style values back into node attributes. This ensures round-trip fidelity: save -> reload -> attributes are preserved.

### File: `src/components/editor/SignatureFieldExtension.tsx`
- Update `parseHTML()` to include `getAttrs` that extracts `data-signature-type`, `data-signer-role`, `data-label`, `data-required`, `data-show-signer-info`, `data-show-date`, `data-show-token`, `data-float`, and width/height from the style attribute.

---

## Issue 2: Public signature URL (`/firmar/:token`) shows the sidebar

**Root Cause**: `SignatureView` uses `SimpleLayout` which wraps content with `AppSidebar` (the full navigation sidebar). Public users should not see any sidebar or navigation.

**Fix**: Replace `SimpleLayout` with `PublicLayout` (which already exists as a clean wrapper without sidebar) in `SignatureView.tsx`.

### File: `src/pages/SignatureView.tsx`
- Replace all `<SimpleLayout>` usages with a simple public container (import and use `PublicLayout` from `src/layouts/PublicLayout.tsx`)
- This removes sidebar, breadcrumbs, and navigation for unauthenticated signature visitors

---

## Issue 3: Adherent signature view UX redesign

**Current behavior**: The adherent sees their DDJJ document content rendered inline inside a scrollable card with the full document visible.

**Desired behavior**: Show a clean list view with items like "DDJJ Salud - Carlos Acosta" with a "Firmar" button on the right. When clicked, it opens the signature canvas (as shown in image 4). After signing, the item shows as "Completado" with a download option.

### File: `src/pages/SignatureView.tsx`
- Redesign the documents section for adherents to show a list of document names (not inline content)
- Each list item shows: document name + status badge + "Firmar" button
- Clicking "Firmar" scrolls to / reveals the signature canvas section
- After signing, show the signed document with download option
- For titulares: show list of all documents (DDJJ Salud + Contrato + Anexos) with same pattern

---

## Issue 4: Template annexes upload (future enhancement)

The user wants the ability to upload additional documents (annexes) within the template editor that get attached to the signature package.

### File: `src/components/TemplateForm.tsx`
- Add a new tab or section "Anexos" in the template form
- Allow uploading PDF/image files that will be associated with the template
- These annexed documents will be included in the signature package when sent

### Database:
- Add a new table `template_attachments` (id, template_id, file_name, file_url, file_type, sort_order, created_at) to store uploaded annexes
- Add appropriate RLS policies for company-scoped access

---

## Technical Summary of Changes

| File | Change |
|------|--------|
| `src/components/editor/SignatureFieldExtension.tsx` | Add `getAttrs` to `parseHTML` for attribute round-trip |
| `src/pages/SignatureView.tsx` | Replace `SimpleLayout` with `PublicLayout`; redesign document list UX |
| `src/layouts/PublicLayout.tsx` | Minor styling improvements for dark mode support |
| `src/components/TemplateForm.tsx` | Add "Anexos" tab for file uploads |
| Database migration | Create `template_attachments` table with RLS |

## Implementation Order

1. Fix signature field attribute persistence (Issue 1)
2. Fix public signature view sidebar (Issue 2)
3. Redesign adherent signature UX (Issue 3)
4. Add template annexes upload (Issue 4)
