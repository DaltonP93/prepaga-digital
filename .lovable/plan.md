

# Plan: Fix 3 Issues (WhatsApp Preview, Document Images, OTP)

## Issue 1: WhatsApp link preview shows Lovable logo

**Root cause**: `index.html` has `og:image` set to `/favicon.ico` (relative URL). WhatsApp's crawler needs an absolute URL. Since the app is deployed on `prepaga.saa.com.py` via custom domain but originated from Lovable, the relative URL may resolve to the wrong favicon, or WhatsApp may use Lovable's default preview.

**Fix**: Update `index.html` to use absolute URLs for all OG and Twitter meta tags pointing to `https://prepaga.saa.com.py`. Also add `og:url` meta tag. Use a proper PNG image for `og:image` instead of `.ico` (WhatsApp prefers at least 200x200 PNG/JPG). Generate an OG image from the existing `favicon.svg` or use the company logo stored in Supabase.

**Files**: `index.html`

---

## Issue 2: Contract header/footer images broken in sale document viewer

**Root cause**: The `DocumentPreviewDialog` component renders document HTML content with `DOMPurify.sanitize()` but does NOT resolve expired Supabase Storage signed URLs for images (logos, headers, footers). The `DocumentPreview` component (used in the template viewer) DOES resolve signed URLs via `getAssetSignedUrl`, which is why templates look fine but sale documents don't.

**Fix**: Add the same signed URL resolution logic from `DocumentPreview` to `DocumentPreviewDialog`. When content contains Supabase storage URLs or `data-storage-path` attributes, resolve them to fresh signed URLs before rendering.

**Files**: `src/components/documents/DocumentPreviewDialog.tsx`

---

## Issue 3: OTP via WhatsApp fails despite correct configuration

**Root cause**: The `signature-otp` Edge Function's `sendViaWhatsApp` function reads the WhatsApp provider from `company_settings.whatsapp_provider`, which is set to `wame_fallback` (manual mode for signature links). However, the OTP configuration in `company_otp_policy` has separate columns (`otp_whatsapp_provider`, `otp_whatsapp_gateway_url`, `otp_use_signature_whatsapp`) that are designed to decouple OTP WhatsApp from signature WhatsApp. The Edge Function ignores these columns entirely - it always reads the main WhatsApp config, which is "wa.me (manual)" and cannot send OTP automatically.

**Fix**: Modify the `sendViaWhatsApp` function in `signature-otp/index.ts` to check `company_otp_policy` columns first:
- If `otp_use_signature_whatsapp` is true, use the main `company_settings` WhatsApp config
- Otherwise, use `otp_whatsapp_provider` and `otp_whatsapp_gateway_url` from `company_otp_policy`
- Pass the OTP policy data to `sendViaWhatsApp` so it can use the correct provider/gateway

This way, the user can configure wa.me for signature links (manual) while using WAHA/QR session for OTP (automatic).

**Files**: `supabase/functions/signature-otp/index.ts` (redeploy required)

---

## Implementation Order
1. Fix `index.html` OG tags (quick)
2. Fix `DocumentPreviewDialog` signed URL resolution
3. Fix `signature-otp` Edge Function to use decoupled OTP WhatsApp config + redeploy

