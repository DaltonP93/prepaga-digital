

# Fix: "Migrar a V2" freezes the page

## Root Cause

When clicking "Migrar a V2", `handleMigrate` calls `setMigrating(true)` then immediately runs `parseLegacyHtml()` synchronously. For a large legal contract (20+ clauses, hundreds of paragraphs), the DOM parsing + tree walking blocks the main thread for several seconds. React never gets a chance to re-render the "Migrando..." spinner because the synchronous work starts before the next paint.

## Fix

### `OpenSignTemplateEditor.tsx` — Yield to browser before heavy parsing

Insert `await new Promise(r => setTimeout(r, 50))` after `setMigrating(true)` and before `parseLegacyHtml()`. This lets React paint the loading state (spinner + disabled button) before the synchronous parse begins.

Additionally, batch the Supabase inserts in chunks of 50 rows to avoid sending one enormous payload if the contract generates 200+ blocks.

```text
handleMigrate flow:
  setMigrating(true)
  await setTimeout(50)     ← let React paint spinner
  parseLegacyHtml(...)     ← synchronous but now spinner is visible
  insert blocks (chunked)
  insert fields
  invalidate queries
  setMigrating(false)
```

### `legacyToBlocks.ts` — Skip redundant nested blocks

Add a guard: when a `div` or `p` is processed, skip it if its `outerHTML` length exceeds 50KB (likely a wrapper div capturing the entire document). Also avoid processing `span`/`strong`/`em`/`li` at top level since they're typically inline — only process block-level elements (`p`, `div`, `ul`, `ol`, `blockquote`).

## Files

| File | Change |
|------|--------|
| `OpenSignTemplateEditor.tsx` | Yield to paint before parsing; chunk inserts |
| `legacyToBlocks.ts` | Skip wrapper divs; limit inline element processing |

