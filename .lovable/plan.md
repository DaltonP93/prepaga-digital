

# Plan: Fix PDF Preview Error + Amount Mismatch in Signature View

## Issues Identified

### Issue 1: PDF Preview Shows Error (blob URL)
The "Vista Previa" button in DocumentPreview calls `usePDFGeneration.previewPDF()`, which calls the `generate-pdf` edge function. That function returns **JSON** (with an HTML string), not a binary PDF. The hook then wraps this JSON in `new Blob([data], { type: 'application/pdf' })`, creating an invalid PDF blob. When the browser tries to render it as a PDF, it fails with "Error - Se ha producido un error al cargar el documento PDF."

### Issue 2: Amount Mismatch in Signature View (310,000 vs 350,000)
In `SignatureView.tsx` line 558, the "Plan Contratado" card displays `formatCurrency(Number(plan.price || 0))` — the **plan's base price** (310,000). It should display the sale's `total_amount` (350,000) which includes the titular + adherentes. The `sale.total_amount` field is already available in `linkData.sale`.

---

## Changes

### 1. `src/hooks/usePDFGeneration.ts` — Fix previewPDF to render HTML properly

The `generate-pdf` edge function returns `{ html: string }`. Instead of wrapping it as a fake PDF blob, the `previewPDF` function should:
- Parse the JSON response to extract the `html` field
- Open a new window and write the HTML content directly (same pattern used in `SignatureView.handleDownloadSignedContent`)
- This renders the document correctly for print/preview

Similarly, `downloadPDF` should open the HTML in a new window and trigger `window.print()` for actual PDF output via the browser's print dialog, since the edge function doesn't return a binary PDF.

**Key change in `generatePDF`**: Instead of `new Blob([data], { type: 'application/pdf' })`, parse the response JSON and return the HTML string. Adjust `previewPDF` and `downloadPDF` to work with HTML content.

### 2. `src/pages/SignatureView.tsx` — Show sale total instead of plan price

Line 558: Change `formatCurrency(Number(plan.price || 0))` to `formatCurrency(Number(sale?.total_amount || plan.price || 0))`.

This ensures the signature page shows the actual sale amount (350,000 Gs) rather than the plan's base price (310,000 Gs).

---

## No Other Changes
- The `generate-pdf` edge function itself is fine — it correctly returns processed HTML
- The `generate-base-pdf` function (used in the signature flow) already produces real PDFs server-side — unaffected
- No database or UX layout changes

