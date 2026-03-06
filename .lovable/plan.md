

## Plan: Replace `generate-evidence-certificate` with improved version

### Analysis

After reviewing the current code, the infrastructure is already in place:
- `finalize-signature-link` already calls `generate-evidence-certificate` after PAdES signing (lines 62-72)
- `get-document-download-url` already supports `kind='evidence'` (line 31)
- SQL migration for `evidence_certificate_url`, `evidence_certificate_hash`, and `legal_evidence_certificates` table already applied

The only change needed is replacing the Edge Function itself with the user's improved version, which adds:

1. **Better signer name resolution** — queries `company_settings` for contratada name, `beneficiaries` for adherente name (current version just uses `recipient_name` or `recipient_email`)
2. **`tokenReference()` helper** — truncates tokens for display (`abc123...xyz9`)
3. **Separate company query** — more robust than the join approach
4. **Fallback link resolution** — if no `signature_link_id` provided, finds last completed link
5. **OTP/consent via `signature_events` foreign keys** — uses `identity_verification_id` and `consent_record_id` from events
6. **PDF margins** in render options
7. **`json()` helper** for cleaner responses
8. **405 for non-POST** methods

### Single change

Replace `supabase/functions/generate-evidence-certificate/index.ts` entirely with the user-provided code. Then deploy.

