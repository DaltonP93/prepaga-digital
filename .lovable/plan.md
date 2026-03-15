

# Fix Signature Migration Logic in legacyToBlocks.ts

## Problem
The current parser creates signature blocks based on loose text matching (`/firma del/i`), which can produce arbitrary or incorrect signature assignments. The business rule is clear: contracts have exactly **2 mandatory signatures** — `titular` (client) and `contratada` (company representative).

## Changes

### 1. `src/lib/legacyToBlocks.ts` — Rewrite signature detection

Replace the current per-element signature heuristic with a **two-pass approach**:

**Pass 1**: Walk HTML as before for headings, tables, text blocks — but when encountering a signature pattern, instead of immediately creating a block, **collect** the match into a `signatureHits` array with the detected text.

**Pass 2**: After the walk, analyze all collected signature hits and produce exactly **2 signature blocks**:
- One with `signer_role: "titular"`, label: "Firma del Contratante"
- One with `signer_role: "contratada"`, label: "Firma de la Contratada"

If no signature patterns are found at all, skip signature blocks entirely (don't invent them).

**Key rules**:
- Signature detection stays: `/firma[:\s]*_{3,}/i` or `/firma del/i` — but matches are collected, not emitted inline
- Text elements that match signature patterns are **excluded** from becoming text blocks (avoid duplicating the signature area as a text paragraph)
- Both signature blocks get `h: 15` (not `h: 0`) so they render visibly
- The label is cleaned: strip underscores, trim, but keep a meaningful description

### 2. `src/components/designer2/BlockPropertyPanel.tsx` — Improve signature block labels

In the signature_block `TypeProperties` case (already at line 320), add clearer role descriptions:

Update `SIGNER_ROLES` labels to be more descriptive:
- `"titular"` → `"Titular / Contratante"`
- `"contratada"` → `"Contratada / Empresa"`

This is a minor label change (lines 28-32).

## Files

| File | Change |
|------|--------|
| `src/lib/legacyToBlocks.ts` | Rewrite signature detection: collect-then-emit 2 blocks |
| `src/components/designer2/BlockPropertyPanel.tsx` | Update SIGNER_ROLES labels |

