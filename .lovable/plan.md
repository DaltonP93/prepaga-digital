

# Plan: Fix CUOTA amount in beneficiary table + Fix PDF images (header/footer)

## Issues

### Issue 1: CUOTA shows plan price (310,000) instead of sale amount (400,000)
In `enhancedTemplateEngine.ts`, when the titular beneficiary has no `amount` saved, lines 269 and 280-281 fall back to `plan?.price`. Since the "Precio" field was removed from plans, this is stale data. The fallback should use `sale.total_amount` instead.

### Issue 2: PDF header/footer images not rendering
The `doc.content` HTML contains `<img>` tags with `data-storage-path` attributes whose `src` URLs are expired Supabase signed URLs. The `generate-base-pdf` edge function sends this HTML to Puppeteer as-is — Puppeteer can't load expired URLs, so the images don't appear.

---

## Changes

### 1. `src/lib/enhancedTemplateEngine.ts` — Use sale.total_amount as fallback

**Line 269** (titularFallback object):
```ts
// BEFORE
amount: plan?.price || 0,
// AFTER
amount: sale?.total_amount || plan?.price || 0,
```

**Lines 280-281** (titular with amount=0):
```ts
// BEFORE
return createBeneficiaryContext({ ...b, amount: plan?.price || 0 });
// AFTER
return createBeneficiaryContext({ ...b, amount: sale?.total_amount || plan?.price || 0 });
```

### 2. `supabase/functions/generate-base-pdf/index.ts` — Resolve expired image URLs server-side

Add a function that:
1. Scans `doc.content` for `<img>` tags with `data-storage-path` attribute
2. For each, generates a fresh signed URL using Supabase admin client
3. Replaces the expired `src` with the fresh URL

This runs before `buildWrappedHtml()` wraps the content, ensuring all images (header, footer, inline) are accessible when Puppeteer renders the PDF.

Also resolve the `company.logo_url` if it's a Supabase storage URL (signed or public) — generate a fresh signed URL to ensure it's accessible from the render service.

