

# Plan: Fix Contratada Signature Showing Company Name Instead of Signer Name

## Problem
When the contratada signs, the PDF shows "SAMAP Prepaga Digital" instead of "Eder Arguello González" and C.I. is empty. This happens because `company_settings_public` view uses `security_invoker = true` and doesn't expose `contratada_signer_dni`, so queries from anonymous/token-based clients return null or incomplete data, falling back to company name.

## Solution
Replace the two `company_settings_public` queries with the existing `get_contratada_info_by_token` RPC (SECURITY DEFINER), which can read the data without RLS restrictions. Also add `recipient_name` to the signature link select so it's available as a fallback.

## Changes

### 1. `src/hooks/useSignatureLinkPublic.ts`

**a) Add `recipient_name` to the link select query** (line 92):
Add `recipient_name` to the comma-separated select fields.

**b) Replace first `company_settings_public` query** (lines 330-348, contratada merge block):
Replace with RPC call:
```typescript
const { data: contratadaInfo } = await signatureClient
  .rpc('get_contratada_info_by_token', { p_token: token });
const cInfo = Array.isArray(contratadaInfo) ? contratadaInfo[0] : contratadaInfo;
```
Then update signerName/signerCI references:
```typescript
const signerName = cInfo?.signer_name || (linkData as any)?.recipient_name || 'Representante Legal';
const signerCI = cInfo?.signer_dni || '';
```

**c) Replace second `company_settings_public` query** (lines 518-526, main document building block):
Same RPC approach. Update the contratada branch (line 600-603) to use:
```typescript
signerName = cInfo?.signer_name || (linkData as any)?.recipient_name || 'Representante Legal';
signerCI = cInfo?.signer_dni || '';
```

Note: `linkData` is not directly available in the mutation context — it comes from `data` (the updated link). The `token` parameter IS available. We'll use the RPC which only needs the token.

### 2. No database changes needed
The `get_contratada_info_by_token` function already exists with the correct signature and SECURITY DEFINER access.

