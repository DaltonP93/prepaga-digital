

# Plan: Repeating Header/Footer on Every Page of Generated PDFs

## Problem
When contracts and DDJJ documents are generated as PDFs, the header (company logo + name) and footer (page number, contact info) appear only once at the beginning and end of the document. The user wants them to repeat on **every page**, like the reference document "CONTRATO_full.pdf".

## Root Cause
The `generate-base-pdf` edge function sends raw `doc.content` HTML to the Render service (Puppeteer) without any wrapping HTML document, styles, or page-level header/footer configuration. The content is just interpolated template HTML with no `@page` CSS rules or `position: fixed` elements.

## Solution
Modify `generate-base-pdf` to:
1. Fetch the **company data** (logo, name, phone, address) from the sale's company
2. Wrap `doc.content` in a complete HTML document with CSS that renders repeating headers/footers on every printed page using `position: fixed` (the proven technique for Puppeteer PDF rendering)
3. Pass proper **margins** to the Render service so header/footer areas don't overlap body content

## Changes

### `supabase/functions/generate-base-pdf/index.ts`

**A) Fetch company info via the sale:**
- Query `sales.company_id` using `doc.sale_id`
- Then query `companies` for `name`, `logo_url`, `phone`, `address`, `email`

**B) Build a wrapper HTML function** that includes:
- `position: fixed; top: 0` header div with company logo (left) + document name (right), with a bottom border — repeats on every page via CSS print rules
- `position: fixed; bottom: 0` footer div with company contact info + page counter
- `@page` margin rules (`margin-top: 35mm; margin-bottom: 25mm`) to reserve space for header/footer
- Body content placed in a `main` div that flows naturally between the fixed header/footer

**C) Pass margins to the Render service:**
```json
{
  "format": "A4",
  "printBackground": true,
  "margin": { "top": "35mm", "right": "15mm", "bottom": "25mm", "left": "15mm" }
}
```

### CSS structure for repeating header/footer (inside the wrapper)
```text
┌──────────────────────────────────┐
│  [Logo]  Company Name    Doc Name│  ← position:fixed; top:0
│──────────────────────────────────│
│                                  │
│         Body content             │  ← normal flow, margin-top:35mm
│         (doc.content)            │
│                                  │
│──────────────────────────────────│
│  Company info     Page X of Y    │  ← position:fixed; bottom:0
└──────────────────────────────────┘
```

The `position: fixed` technique works in Chromium-based PDF renderers (which the Render service uses) to repeat elements on every printed page.

### No frontend changes needed
The documents will automatically render with repeating headers/footers on next generation. Existing documents would need to be regenerated (using the existing "Regenerar Documentos" button) to pick up the new formatting.

