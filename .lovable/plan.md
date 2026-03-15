

# Connect Designer 2.0 to the Template Editor UI

## Current Problem

The `TemplateDesigner2` component and all its backend infrastructure (blocks, fields, assets, edge functions) exist but are **completely disconnected from the UI**. Nothing imports or renders `TemplateDesigner2`. The `TemplateForm.tsx` only uses the legacy `TemplateDesigner` (1.0) and has no `designer_version` selector.

## What This Plan Does

Wire up the Designer 2.0 into `TemplateForm.tsx` so users can choose between Legacy 1.0 and Designer 2.0 Premium when editing a template.

## Changes

### 1. `src/components/TemplateForm.tsx`

**Add `designer_version` to the form:**
- Add `designer_version: string` to `TemplateFormData` (values: `"1.0"` or `"2.0"`)
- Initialize from `template?.designer_version || "1.0"` on edit
- Save `designer_version` in `onSubmit` alongside other template data

**Add engine selector to the Setup tab:**
- After the "Template Activo" switch, add a "Motor del Template" section with two radio-style cards:
  - **Legacy 1.0** — Editor HTML clásico con TipTap
  - **Designer 2.0 Premium** — Canvas A4 con bloques, assets PDF, overlay de campos

**Conditionally render the Content tab:**
- If `designer_version === "1.0"`: render the existing `TemplateDesigner` (legacy)
- If `designer_version === "2.0"`:
  - If template is not yet saved (`!template?.id`): show message "Guardá el template primero para acceder al canvas de bloques"
  - If template is saved: render `<TemplateDesigner2 templateId={template.id} />`

**Import `TemplateDesigner2`:**
- Add lazy import to keep bundle split: `const TemplateDesigner2 = React.lazy(() => import(...))`

### 2. `src/hooks/useTemplates.ts`

Verify that `useCreateTemplate` and `useUpdateTemplate` pass through the `designer_version` field. If the mutations currently hardcode or ignore it, update them to include `designer_version` in the insert/update payload.

### 3. Template list badge (optional but useful)

In `src/pages/Templates.tsx`, show a small badge on each template card indicating "v1.0" or "v2.0 Premium" based on `template.designer_version`, so users can see at a glance which engine each template uses.

## What does NOT change

- No new tables or migrations (the `designer_version` column already exists in `templates`)
- No edge function changes
- No changes to `TemplateDesigner2` internals
- Legacy 1.0 remains the default for all existing templates
- The asset pipeline, blocks, fields — all untouched

## Technical Notes

- `designer_version` defaults to `"1.0"` in the DB schema, so all existing templates keep working as-is
- The `TemplateDesigner2` component only needs `templateId: string` — it loads its own blocks/fields via hooks
- The content tab for 2.0 does NOT use the `content` form field (blocks are stored separately in `template_blocks`), so the two engines don't conflict

