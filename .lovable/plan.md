

# Plan: Fix 4 Issues (DDJJ Flow, Audit Pricing, WhatsApp Provider, OTP Error)

## Issue 1: DDJJ Save - No Toast Feedback & Adherent Locked After Save

**Root Cause:** After saving the virtual titular's DDJJ, the code deletes `healthData['virtual-titular']` and creates `healthData[realId]`. But the beneficiaries query hasn't refetched yet, so `sortedBeneficiaries[0]` still references `'virtual-titular'`. Since that key was deleted, `isComplete('virtual-titular')` returns false, keeping the adherent step locked. The toast IS present in code (line 418) but may not show if the mutation errors silently during template_responses sync.

**Fix in `src/components/sale-form/SaleDDJJTab.tsx`:**
- In `saveMutation.onSuccess`, keep the `'virtual-titular'` key in `healthData` (mark it as `saved: true`) in addition to creating the real ID entry. This way, while the old `sortedBeneficiaries` still references `'virtual-titular'`, `isComplete` returns true.
- Auto-advance to the next step after successful save: `setCurrentStep(s => Math.min(s + 1, sortedBeneficiaries.length - 1))`.
- Ensure the toast fires reliably by moving it before the template_responses sync (which is wrapped in try/catch and could fail silently).

## Issue 2: Audit Detail - Precio Shows Gs. 0

**Root Cause:** `AuditSaleDetails` shows `sale.plans?.price` which is 0 (price was removed from plans table). The audit query also doesn't fetch beneficiaries or `total_amount`.

**Fix in `src/components/AuditSaleDetails.tsx`:**
- Replace "Precio" label with "Precio Titular" and show the primary beneficiary's amount.
- Add "Monto Total" field showing `sale.total_amount`.
- Add "Contrato #" field showing `sale.contract_number`.

**Fix in `src/hooks/useSimpleAuditProcess.ts`:**
- Add `beneficiaries(*)` and `total_amount` to the select query.
- Also fetch `salesperson:user_id(first_name, last_name)` for the vendedor field.
- Add more statuses to the filter (currently only `en_auditoria`; consider also `borrador`, `enviado`).

**Fix in `src/components/SimpleAuditDashboard.tsx`:**
- Update list item to show `sale.total_amount` instead of `sale.plans?.price`.

## Issue 3: WhatsApp Provider Resets on Dev Reload

**Root Cause:** The DB has `whatsapp_provider: 'wame_fallback'` but the user expects WAHA. The user may have selected WAHA in the UI but the save may not have persisted correctly, or the `hasApiChanges` guard prevented state sync from the DB on reload. Since both default and DB value are `wame_fallback`, the sync works — but if the user selects WAHA and doesn't click "Guardar", a hot reload resets to the DB value.

**Fix in `src/components/AdminConfigPanel.tsx`:**
- Add a visual unsaved-changes indicator (e.g., dot on "Guardar" button) when `apiFormData` differs from `nextApiFormData`.
- Show a confirmation toast when WhatsApp provider is changed but not yet saved.

## Issue 4: OTP Gateway Error + Email Fallback Failure

**Root Cause:** The WhatsApp gateway at `https://waha.saa.com.py` is returning a 500 error. The email fallback requires `smtp_relay_url` in `company_otp_policy` but it's NULL. The SMTP host/port/from are configured, but the `signature-otp` edge function checks `smtp_relay_url` specifically.

**Fix in `supabase/functions/signature-otp/index.ts`:**
- Update the email fallback logic: if `smtp_relay_url` is not set BUT `smtp_host`, `smtp_port`, and `smtp_from_address` ARE set, use direct SMTP sending instead of requiring the relay URL.
- Alternatively, allow the edge function to use the existing Resend API key as a fallback email sender when SMTP relay is not configured.

**Fix in `src/components/OtpPolicyConfigPanel.tsx`:**
- Show a warning when WhatsApp OTP is enabled but the gateway is unreachable and no email fallback (SMTP relay or Resend) is configured.

---

## Files to Modify

1. `src/components/sale-form/SaleDDJJTab.tsx` — Fix virtual titular save flow
2. `src/components/AuditSaleDetails.tsx` — Fix pricing display
3. `src/hooks/useSimpleAuditProcess.ts` — Add beneficiaries + total_amount to query
4. `src/components/SimpleAuditDashboard.tsx` — Use total_amount in list
5. `src/components/AdminConfigPanel.tsx` — Add unsaved changes indicator
6. `supabase/functions/signature-otp/index.ts` — Fix email fallback to use Resend when SMTP relay not configured

