

## Analysis of Issues

Based on thorough investigation of the codebase and the uploaded images, here are the problems identified and the plan to fix each one:

### Issue 1: Electronic Signature Block is Unprofessional
**Problem**: When the template configures "firma electrónica", the signed document embeds a basic `<div>` with raw text. In the Documents view (image 81), the signed DDJJ shows raw HTML attributes (`data-required="true" data-show-signer-info="true"...`) rendered as visible text, plus a duplicate canvas signature on top.

**Root Cause**: In `useSignatureLinkPublic.ts` (lines 331-342), the electronic signature block is too minimal. Additionally, the signature field HTML node from the template editor (`<div data-signature-field="true" data-signature-type="electronica" ...>`) is NOT being replaced — it's left as raw HTML text in the final document because DOMPurify or the rendering strips the div but leaves the attributes as text.

**Fix**: 
- Replace the signature field `<div>` elements (matching `data-signature-field="true"`) with the electronic signature block BEFORE appending fallback.
- Create a professional electronic signature block following international standards (UUID token, ISO 8601 timestamp, hash reference).

### Issue 2: Double Signature in Signed Documents  
**Problem**: The signed documents show both a canvas signature image AND an electronic signature block, or duplicate signatures.

**Root Cause**: In `useSignatureLinkPublic.ts`, the code tries placeholder replacement (`{{firma_contratante}}`, `{{firma_titular}}`), then text marker replacement, then falls back to appending at the end. But the signature field `<div>` from the template editor is a separate HTML element that is never targeted. So it appears as raw text AND the fallback appends another signature block.

**Fix**: Add a regex to detect and replace `<div[^>]*data-signature-field="true"[^>]*>.*?</div>` elements with the appropriate signature block.

### Issue 3: Double Beneficiary Table in Contract
**Problem**: Image 82 shows the contract renders TWO beneficiary table blocks — one from the explicit `{{#beneficiarios}}` loop and another from the fallback TR auto-expansion.

**Root Cause**: In `enhancedTemplateEngine.ts` (line 470), after processing `{{#beneficiarios}}` loops, the fallback check `hasBeneficiaryPlaceholders` still finds unresolved placeholders because the loop might use Spanish names (`{{nombre}}`) but the regex checks for English names (`{{first_name}}`). OR the template has BOTH a loop section AND a separate table with raw placeholders.

**Fix**: After the `{{#beneficiarios}}` loop replacement, mark the result so the fallback doesn't run. Add a flag: if the loop regex matched anything, skip the fallback TR expansion entirely.

### Issue 4: V.I. and TIPO Empty in Beneficiary Table
**Problem**: The V.I. column shows blank lines and TIPO shows "Titular"/"hijo" (parentesco) instead of the sale's vigencia_inmediata and tipo_venta.

**Root Cause**: The template likely has the correct `{{vigencia_inmediata}}` and `{{tipo_venta}}` placeholders inside the beneficiary table row. These ARE in the fallback aliases (line 495-496). However, if the explicit loop runs first, these get replaced within the loop context. The issue may be that the template has `{{relationship}}` in the TIPO column instead of `{{tipo_venta}}`. Since I can't directly edit the template content in the database, the fix must ensure both `{{tipo_venta}}` AND a TIPO-column context work correctly. Also need to ensure these legacy aliases run BEFORE the beneficiary loop so they're available globally.

**Fix**: Ensure `{{vigencia_inmediata}}` and `{{tipo_venta}}` are replaced as top-level legacy aliases BEFORE the beneficiary loops run, so they work both inside and outside loops.

### Issue 5: DDJJ Data Not Loading in Documents
**Problem**: The signed DDJJ documents don't show complete health declaration data.

**Root Cause**: When generating documents via `SaleTemplatesTab`, the DDJJ responses are built from `template_responses` or fallback from `preexisting_conditions_detail`. The parsing logic may miss some fields. Also, when the document is viewed in the signature flow, the content was already rendered at generation time — if the template variables weren't populated then, they remain empty.

**Fix**: Strengthen the DDJJ data fallback in `SaleTemplatesTab.handleSendDocuments` to ensure all 7 questions, biometry, and habits are always populated.

### Issue 6: Notifications Not Updating Dynamically
**Problem**: Notifications don't refresh in real-time per user role. The page requires manual reload.

**Root Cause**: The `useRealTimeNotifications` hook subscribes to `notifications` INSERT and `sales` UPDATE, but the Realtime channel doesn't filter by `user_id`, so it triggers for ALL users. Also, there's no subscription for `documents`, `signature_links`, or `signature_workflow_steps` changes. The `useNotifications` hook has its own channel but it's basic.

**Fix**: 
- Add Realtime subscriptions for `documents`, `signature_links`, and `signature_workflow_steps` tables.
- Filter notifications channel by the current user's ID using the Realtime filter.
- Invalidate relevant query keys (`sales`, `sale-generated-documents`, `signature-links`) when changes occur.
- Add broader query invalidation across the app for dynamic updates.

---

## Implementation Plan

### Step 1: Fix Electronic Signature — Professional Block (useSignatureLinkPublic.ts)
- Replace the basic electronic signature block with a professional format including:
  - UUID v4 token (RFC 4122) as document reference
  - ISO 8601 timestamp
  - IP address and device fingerprint
  - Legal disclaimer text
  - Clean bordered layout
- Add regex to find and replace `<div data-signature-field="true"...>` elements in document content with the signature block

### Step 2: Fix Double Beneficiary Table (enhancedTemplateEngine.ts)
- Track whether the `{{#beneficiarios}}` loop matched and expanded
- If it did, skip the fallback TR auto-expansion entirely
- Move legacy alias replacement (`{{vigencia_inmediata}}`, `{{tipo_venta}}`, `{{monto_total_letras}}`) to run BEFORE the beneficiary loop so they're globally available

### Step 3: Fix V.I. and TIPO in Beneficiary Rows (enhancedTemplateEngine.ts)
- Ensure `{{vigencia_inmediata}}` and `{{tipo_venta}}` are in both the loop aliases AND the global legacy aliases
- These should reflect the sale-level values (Sí/No and Venta Nueva/Reingreso)

### Step 4: Fix DDJJ Data Population (SaleTemplatesTab.tsx)
- Enhance the fallback DDJJ parsing to always extract weight, height, habits
- Ensure adherent DDJJ documents get their own specific health data (from their own `preexisting_conditions_detail`)

### Step 5: Real-Time Notifications & Dynamic Updates
- **useRealTimeNotifications.ts**: Add subscriptions for `documents`, `signature_links`, `signature_workflow_steps` tables
- **useNotifications.ts**: Filter the Realtime channel to only the current user's notifications using `filter` parameter
- Invalidate query keys for `sales`, `sale-generated-documents`, `signature-links`, `sale-templates` on relevant changes
- Ensure the dashboard, sale detail, and documents pages all react to real-time changes without page reload

### Step 6: Fix Signature Embedding in Document Content (useSignatureLinkPublic.ts)
- Before trying placeholder patterns, search for and replace `<div[^>]*data-signature-field[^>]*>[\s\S]*?<\/div>` with the signature block
- This prevents raw HTML attributes from appearing as text in the final document
- Handle both `data-signature-type="electronica"` and `data-signature-type="digital"` cases

### Files to Modify
1. `src/hooks/useSignatureLinkPublic.ts` — Electronic signature block, signature field replacement
2. `src/lib/enhancedTemplateEngine.ts` — Fix double table, V.I./TIPO, ordering of replacements
3. `src/components/sale-form/SaleTemplatesTab.tsx` — DDJJ data population per beneficiary
4. `src/hooks/useRealTimeNotifications.ts` — Add more Realtime subscriptions
5. `src/hooks/useNotifications.ts` — Filter by user, broader invalidation

### Technical Details

**Professional Electronic Signature Block Format:**
```text
┌─────────────────────────────────────────┐
│ ✓ FIRMA ELECTRÓNICA                     │
│ Conforme Ley N° 4017/2010 de Paraguay   │
│                                         │
│ Firmante: [nombre completo]             │
│ C.I.: [número]                          │
│ Fecha: 2026-02-25T14:30:00-03:00        │
│ Referencia: UUID-v4                     │
│ IP: x.x.x.x                            │
│ Dispositivo: [user agent summary]       │
│                                         │
│ Hash de verificación: SHA-256           │
└─────────────────────────────────────────┘
```

**Double Table Prevention Logic:**
```text
1. Run legacy aliases (global replacements)
2. Run {{#beneficiarios}} loop
3. Check if loop matched → set flag
4. If flag NOT set → run fallback TR expansion
5. If flag IS set → skip fallback
```

