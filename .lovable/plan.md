

## Plan: Fix document download in the "Documentos" tab of SaleDetail

### Problem
In the SaleDetail page "Documentos" tab, clicking "Descargar" on generated documents (Contrato, DDJJ Salud) shows "Documento sin archivo" because these documents store HTML in the `content` field and have `file_url = null`. The current `handleDownload` only works with `file_url`.

Meanwhile, the "Descargar Documento Firmado" button in SignatureWorkflow works correctly because it falls back to opening the HTML content in a print window.

### Solution
Update `DocumentsManager.tsx` to:
1. Include `content` in the database query
2. When downloading, try `signed_pdf_url` via the `get-document-download-url` edge function first, then fall back to `file_url` (storage signed URL), then fall back to opening the HTML `content` in a new print-ready window (matching the branding-aware format used in SignatureWorkflow)

### Changes

**File: `src/components/DocumentsManager.tsx`**

1. Add `content`, `is_final`, and `signed_pdf_url` to the select query (line 31)
2. Update `handleDownload` to implement the three-tier fallback:
   - First: try `get-document-download-url` edge function for signed PDFs (if `signed_pdf_url` exists)
   - Second: try storage signed URL (if `file_url` exists)
   - Third: open HTML content in a print-ready window with proper styling and branding margins (if `content` exists)
3. Apply the same fix to the Eye/preview button flow so it can also render HTML content documents

### Technical Details

The HTML print window will use the same CSS as `SignatureWorkflow.handleDownloadContent`: A4 page size, 20mm margins, proper font sizing, and `print-color-adjust: exact` for branding images. This ensures the branding header/footer added to `generate-pdf` renders correctly when printing.

