

# Security Hardening Plan - Full System Scan

The scan found **12 findings**: 4 errors and 8 warnings. Here is the plan to fix them all via a single database migration.

---

## Findings Summary & Actions

### ERRORS (Critical - Must Fix)

| # | Finding | Fix |
|---|---------|-----|
| 1 | **Realtime channel subscriptions** - no RLS on `realtime.messages` | **Ignore** - Already mitigated: all published tables have company-scoped RLS. Supabase enforces SELECT policies before delivering events. Cannot modify `realtime` schema. |
| 2 | **OTP hashes readable via signature token** - public SELECT on `signature_identity_verification` exposes `otp_code_hash` | **Fix** - Restrict anonymous SELECT to exclude `otp_code_hash` by using column-level GRANT and replacing the public policy. |
| 3 | **Auth attempts cross-company** - any admin can read all companies' login attempts | **Fix** - The table has no `company_id`. Add column, backfill from profiles, and scope the policy. |
| 4 | **Gestors manage templates across companies** - no `company_id` scope | **Fix** - Add `company_id` check to the policy. |
| 5 | **Public can DELETE documents by signature token** - unauthenticated deletion of legal documents | **Fix** - Remove the public DELETE policy entirely. Only authenticated admins/gestors should delete. |

### WARNINGS (Should Fix)

| # | Finding | Fix |
|---|---------|-----|
| 6 | **company_settings readable** | **Ignore** - Already restricted to admin-only ALL policy. No broader SELECT exists. |
| 7 | **company_otp_policy policies on {public} role** | **Fix** - Change policies to target `authenticated` role. |
| 8 | **password_reset_tokens on {public} role** | **Fix** - Change policy to target `authenticated` role. |
| 9 | **Communication logs viewable by all company members** | **Fix** - Remove the broad "Users can view communication logs" policy; keep admin-only SELECT. |
| 10 | **Beneficiary documents exclude supervisors/auditors** | **Fix** - Add `supervisor` and `auditor` roles to the policy. |
| 11 | **Incidents with NULL company_id visible to all** | **Fix** - Remove the `company_id IS NULL` condition. |
| 12 | **Storage documents bucket** - no signature-token file access | **Ignore** - The app uses the `get-document-download-url` Edge Function with signed URLs (1h expiry), so direct bucket access isn't needed for signers. |

---

## Technical Implementation

A single Supabase migration with the following SQL changes:

### 1. OTP Hash Protection (Finding 2)
- Revoke all on `signature_identity_verification` from `anon`
- Grant SELECT on specific columns only (excluding `otp_code_hash`) to `anon`
- Recreate the public SELECT policy scoped to non-sensitive columns

### 2. Auth Attempts Cross-Company (Finding 3)
- Add `company_id` column to `auth_attempts`
- Create index on `company_id`
- Drop and recreate the SELECT policy scoped by `company_id` matching the admin's company

### 3. Templates Cross-Company (Finding 4)
- Drop "Gestors can manage templates" policy
- Recreate with `company_id = get_user_company_id(auth.uid())` scope
- Change role from `{public}` to `{authenticated}`

### 4. Remove Public Document DELETE (Finding 5)
- Drop "Public can delete documents by signature token" policy

### 5. company_otp_policy Role Fix (Finding 7)
- Drop and recreate "Admins can manage OTP policy" targeting `authenticated` role

### 6. password_reset_tokens Role Fix (Finding 8)
- Drop and recreate "Users can manage own reset tokens" targeting `authenticated` role

### 7. Communication Logs (Finding 9)
- Drop "Users can view communication logs" broad policy
- Drop "Users can create communication logs" broad policy on `{public}`
- Keep admin-only and authenticated-scoped policies

### 8. Beneficiary Documents (Finding 10)
- Drop and recreate both policies adding `supervisor` and `auditor` roles

### 9. Incidents NULL company_id (Finding 11)
- Drop and recreate `incidents_select` policy removing `OR (company_id IS NULL)` condition

---

## What Won't Change
- No frontend code changes needed
- No Edge Function changes needed
- Existing admin workflows remain functional
- Signature flow continues working (signed URLs for document access)

