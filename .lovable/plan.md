
## Completed Fixes (2026-02-25)

All 6 issues from the approved plan have been implemented:

### ✅ Issue 1 & 6: Professional Electronic Signature Block
- Replaced basic signature block with ISO 8601/RFC 4122 compliant format
- Includes UUID document reference, timestamp, IP, device info, hash verification
- Added regex to detect and replace `<div data-signature-field="true">` elements
- Cleans raw attribute text that leaked from HTML sanitization

### ✅ Issue 2: Double Signature Prevention
- Signature field divs from template editor are now properly replaced BEFORE fallback
- Priority order: signature-field divs → placeholders → text markers → fallback append

### ✅ Issue 3: Double Beneficiary Table Prevention
- Added `beneficiaryLoopMatched` flag to track if `{{#beneficiarios}}` loop ran
- Fallback TR expansion only runs if the loop did NOT match

### ✅ Issue 4: V.I. and TIPO in Contract
- `{{vigencia_inmediata}}` and `{{tipo_venta}}` already existed in legacy aliases (run before loop)
- Also available inside both loop and fallback contexts

### ✅ Issue 5: DDJJ Data Per Beneficiary
- Each adherent's DDJJ now uses their own `preexisting_conditions_detail` data
- Per-beneficiary health parsing: weight, height, habits, 7 questions
- Falls back to global responses if beneficiary-specific data is empty

### ✅ Issue 6: Real-Time Notifications & Dynamic Updates
- Subscriptions added for: notifications, sales, documents, signature_links, signature_workflow_steps, beneficiaries, sale_templates, audit_processes
- Broad query invalidation ensures all pages update dynamically
- useNotifications also listens to all events (INSERT/UPDATE/DELETE) instead of just INSERT
