

## Plan: Add missing `favicon` column to `companies` table

The `useBranding` hook writes to a `favicon` column on `companies` that doesn't exist yet. Same pattern as the previous `custom_css` and `border_radius` fixes.

### Change

**Database migration** — Add the missing column and refresh the schema cache:

```sql
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS favicon text;
NOTIFY pgrst, 'reload schema';
```

No code changes needed — the frontend already references this column correctly.

