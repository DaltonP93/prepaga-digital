

# Migrate from `fromAnyTable()` to typed `supabase.from()` in 4 hooks

## Context

All 7 tables are now in `types.ts`. The `fromAnyTable()` untyped bridge is no longer needed for these hooks. This cleanup gives proper type safety and IDE autocomplete.

## Key Technical Detail

The DB types use `Json` for complex columns (`content`, `style`, `visibility_rules`, `meta`), while the custom types in `src/types/templateDesigner.ts` use rich interfaces. Each hook will cast row results to the custom types at the boundary (same as today, but now the query itself is typed).

## Changes

### 1. `src/hooks/useTemplateBlocks.ts`
- Replace `import { fromAnyTable }` with `import { supabase } from '@/integrations/supabase/client'`
- Change all `fromAnyTable('template_blocks')` → `supabase.from('template_blocks')`
- Remove `as any` on insert/update payloads (cast `content`/`style`/`visibility_rules` to `Json` where needed)
- Keep `as unknown as TemplateBlock[]` cast on results (Json → rich types)

### 2. `src/hooks/useTemplateFields.ts`
- Same pattern: `fromAnyTable('template_fields')` → `supabase.from('template_fields')`
- Cast `meta` field to `Json` on insert/update
- Keep result casts

### 3. `src/hooks/useTemplateAssets.ts`
- `fromAnyTable('template_assets')` → `supabase.from('template_assets')`
- `fromAnyTable('template_asset_pages')` → `supabase.from('template_asset_pages')`
- Cast `metadata` to `Json` on insert
- Keep result casts

### 4. `src/hooks/useIncidents.ts`
- `fromAnyTable('incidents')` → `supabase.from('incidents')`
- `fromAnyTable('incident_comments')` → `supabase.from('incident_comments')`
- `fromAnyTable('incident_attachments')` → `supabase.from('incident_attachments')`
- Keep existing result casts to `IncidentRecord` etc.

### 5. `src/integrations/supabase/untyped-client.ts`
- Keep the file (may be useful for future untyped tables), but it will have zero imports after this change.
- Optionally add a comment noting it's available for future tables not yet in types.

## No other files change
- `src/types/templateDesigner.ts` stays as-is
- No migrations needed
- No edge function changes

