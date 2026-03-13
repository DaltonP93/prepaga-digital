

# Fix: Duplicate identifier 'Database' build error + compose-template-pdf alignment

## Root cause

The `types.ts` file contains exactly ONE `export type Database` declaration. The error is a stale build cache artifact from prior editing sessions. A trivial database schema change will force Lovable's type regeneration pipeline to produce a fresh `types.ts`, clearing the cached error.

## Simultaneous fix: `compose-template-pdf` uses wrong column

The Edge Function references `asset.storage_path` but the actual column is `file_url`. This will be corrected in the same pass.

---

## Implementation

### 1. Trigger type regeneration via migration

Run a no-op schema change that touches a table already in the types file (e.g. `templates`):

```sql
COMMENT ON TABLE public.templates IS 'Company document templates - updated';
```

This forces the platform to regenerate `types.ts` from scratch, clearing the duplicate identifier cache.

### 2. Fix `compose-template-pdf` -- use `file_url` instead of `storage_path`

In `supabase/functions/compose-template-pdf/index.ts`:
- Line 90: change `asset.storage_path` to `asset.file_url`
- Line 140: change `pdfAsset.storage_path` to `pdfAsset.file_url`

### Files to modify
- `supabase/functions/compose-template-pdf/index.ts` -- fix column references
- New migration file -- trigger type regen

### No other changes needed
The `fromAnyTable` pattern already bypasses type checking for designer tables, so once the cache clears the build will pass.

