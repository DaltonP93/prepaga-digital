

# Plan: Fix Titular CUOTA Calculation in Template Engine

## Problem
In `enhancedTemplateEngine.ts`, when the titular has no entry in the `beneficiaries` table, a fallback is created with `amount: sale.total_amount`. This is the **sum of all amounts**, not the titular's individual share. So in the CUOTA column of the contract table, the titular shows the total instead of their portion.

**Example:** Sale total = 450,000. Adherent amount = 50,000. Titular's CUOTA should be 400,000 but currently shows 450,000.

## Database Fields (for reference)
- `sales.total_amount` → "Monto Total (Gs.)" in the Básico tab = sum of all beneficiary amounts
- `beneficiaries.amount` → "Monto (Gs.)" per adherent/titular
- Template `{{monto}}` inside `{{#beneficiarios}}` loop → each beneficiary's individual amount (CUOTA column)
- Template `{{monto_total}}` → formatted total of all amounts
- Template `{{monto_total_letras}}` → total in words

## Change: `src/lib/enhancedTemplateEngine.ts`

In `createEnhancedTemplateContext()`, calculate the titular's individual amount correctly:

**Lines 252-282 — Titular fallback logic:**

1. Before building the fallback, compute sum of non-primary beneficiary amounts:
```ts
const adherentSum = normalizedBeneficiaries
  .filter(b => !b.is_primary)
  .reduce((sum, b) => sum + (b.amount || 0), 0);
const titularAmount = (sale?.total_amount || 0) - adherentSum;
```

2. Use `titularAmount` (instead of `sale.total_amount`) for:
   - Line 269: `amount: titularAmount > 0 ? titularAmount : (sale?.total_amount || plan?.price || 0)`
   - Line 281: same fallback for titular with amount=0

This ensures the CUOTA column in the contract shows:
- Row 1 (Titular): 400,000
- Row 2 (Adherent): 50,000  
- TOTAL: 450,000

No other files need changes — the template variables `{{monto_total}}` and `{{monto_total_letras}}` already use `effectiveTotal` which sums all beneficiary amounts correctly.

