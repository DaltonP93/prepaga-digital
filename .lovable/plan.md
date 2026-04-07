

## Plan: Add branding header/footer to the `generate-pdf` edge function

### Problem
The `generate-pdf` edge function returns HTML without any header/footer branding images. The `generatePDFHtml()` function at line 259 produces a plain document with no company branding. Only the separate `generate-base-pdf` function (Puppeteer-based) fetches `pdf_header_image_url` and `pdf_footer_image_url` from `company_settings`.

### Solution
Modify the `generate-pdf` edge function to:
1. Fetch the authenticated user's `company_id` from their profile
2. Query `company_settings` for `pdf_header_image_url` and `pdf_footer_image_url`
3. Include those images in the generated HTML output (header at top, footer at bottom of each page using CSS `position: fixed` for print)

### Changes

**File: `supabase/functions/generate-pdf/index.ts`**

1. After authenticating the user (line ~58), fetch their profile to get `company_id`, then query `company_settings` for the PDF branding image URLs.

2. Pass the branding URLs to `generatePDFHtml()`.

3. Update `generatePDFHtml()` to accept branding options and render:
   - A fixed-position header with the header image (if configured)
   - A fixed-position footer with the footer image (if configured)
   - Adjusted `@page` margins to accommodate the header/footer space (top: 28mm, bottom: 20mm — matching `generate-base-pdf`)

### Technical Details

The branding images will be embedded directly in the HTML using `<img>` tags with the Supabase storage URLs. Since this HTML is opened in a new browser window (not rendered by Puppeteer), the browser will fetch the images directly. CSS `@media print` rules will ensure header/footer repeat on every printed page.

```text
┌──────────────────────────┐
│  [Header Image]          │  ← position: fixed; top: 0
├──────────────────────────┤
│                          │
│  Document Content        │  ← padding-top accounts for header
│                          │
├──────────────────────────┤
│  [Footer Image]          │  ← position: fixed; bottom: 0
└──────────────────────────┘
```

### Testing
After deployment, generate a test contract from the app to verify both header and footer images render correctly in the preview and print dialog.

