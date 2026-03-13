

# Fix: Duplicate identifier 'Database' -- remove the shim that causes it

## Root Cause

`types.ts` has exactly one valid `Database` declaration. `types-shim.ts` also exports `Database`. Both files live in `src/` and both get compiled. The `exclude` in tsconfig.app.json does NOT prevent `types.ts` from being included via module resolution -- it only affects files discovered by `include` glob patterns. Since 40+ files import `@/integrations/supabase/types`, TypeScript resolves this through the `@/*` → `./src/*` mapping and pulls in `types.ts` regardless of the exclude.

The shim was introduced to fix a problem it actually creates.

## Fix (3 files)

### 1. Delete `src/integrations/supabase/types-shim.ts`
Remove the file entirely.

### 2. Revert `src/integrations/supabase/client.ts`
Change line 3 from:
```ts
import type { Database } from './types-shim';
```
back to:
```ts
import type { Database } from './types';
```

### 3. Clean up `tsconfig.app.json`
- Remove the `@/integrations/supabase/types` path mapping override (keep `@/*`)
- Remove `src/integrations/supabase/types.ts` from `exclude`

Result: single `Database` declaration from the auto-generated `types.ts`, no shim, no conflict.

