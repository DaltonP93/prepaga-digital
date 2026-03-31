

# Plan: Fix Contratada Name Display + Contract PDF Issues

## Issue 1: Contratada shows phone number instead of name

**Root cause**: The `signature_links` table has no `recipient_name` column. When `finalize-signature-link` creates the contratada link, it stores `recipient_phone` and `recipient_email` but not the name. The UI in `SignatureWorkflow.tsx` (`getRecipientLabel`) falls back to `recipient_phone` since `recipient_name` is undefined. Similarly, the WhatsApp message hardcodes `'Representante Legal'` instead of using the actual configured name.

**Fix**:

1. **Add `recipient_name` column** to `signature_links` table via migration
2. **Update `finalize-signature-link/index.ts`**:
   - Store `cs.contratada_signer_name` in `recipient_name` when creating the contratada link
   - Use `cs.contratada_signer_name` in the WhatsApp `templateData.clientName` instead of `'Representante Legal'`
3. **Update `SignatureLinkGenerator.tsx`**: Store `contratadaConfig.contratada_signer_name` in `recipient_name` when manually generating contratada links
4. **Update types.ts** to include the new column

## Issue 2: "Descargar Documento Firmado" for contratada — missing signature + bad header/footer images

**Root cause**: The `generate-base-pdf` function wraps document content with a fixed header (company logo) and footer (contact info). However, the document content itself ALSO contains embedded header/footer images from the template (cabecera/zócalo), resulting in duplicated or oversized headers. The header image in the template content gets `width: 100%` forced by CSS rules (lines 130-134), making it fill the entire content width with excessive spacing.

**Fix**:

1. **Update `generate-base-pdf/index.ts`**: Improve `normalizeLegacyContractHeader` to strip embedded header/footer images from template content when they duplicate the fixed header/footer (detect `company-assets/*/branding/` pattern images at start/end of content and remove them since the wrapper already adds proper header/footer)
2. **Check signature merging**: Verify that when contratada signs, the signature block is correctly merged into the contract content before PDF generation

## Issue 3: Missing contratada signature in downloaded PDF

**Root cause**: Need to verify the `pades-sign-document` function correctly includes the contratada signature block when generating the final signed PDF.

**Files to check/modify**:
- `supabase/functions/pades-sign-document/index.ts` — verify signature merging for contratada role

---

## Implementation Order
1. Migration: add `recipient_name` to `signature_links`
2. Update `finalize-signature-link` Edge Function (store name + use in WhatsApp)
3. Update `SignatureLinkGenerator.tsx` (store name on manual creation)
4. Fix `generate-base-pdf` header/footer duplication
5. Verify contratada signature merging in `pades-sign-document`
6. Redeploy affected Edge Functions

## Files Modified
- New migration SQL
- `supabase/functions/finalize-signature-link/index.ts`
- `src/components/signature/SignatureLinkGenerator.tsx`
- `src/pages/SignatureWorkflow.tsx` (minor — label already handles `recipient_name`)
- `supabase/functions/generate-base-pdf/index.ts`
- `src/integrations/supabase/types.ts`

