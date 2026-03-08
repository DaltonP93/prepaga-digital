

## Analysis

After extensive investigation, I found the root cause of the DDJJ document not being generated:

The generation loop in `handleSendDocuments` and `handleRegenerateDocuments` calls `interpolateEnhancedTemplate()` on ALL templates, including the **Anexo PLAN SEVEN** which has **3.17 MB** of content (likely embedded base64 images). Running complex regex operations on 3.17 MB of text is extremely heavy and can cause silent failures that prevent subsequent templates (DDJJ) from being processed. There is **no individual try/catch** around each template in the loop, so any issue in one template's processing breaks the entire sequence.

Additionally, annexo documents don't need variable interpolation at all -- they contain static content/images.

## Plan

### 1. Add per-template try/catch in both generation functions

In `SaleTemplatesTab.tsx`, wrap each template processing iteration (in both `handleSendDocuments` at ~line 303 and `handleRegenerateDocuments` at ~line 610) with individual try/catch blocks. This prevents one template failure from blocking others.

### 2. Skip interpolation for anexo templates

For templates identified as `isAnexo`, skip the `interpolateEnhancedTemplate()` call entirely and use the raw content. This avoids running expensive regex operations on the 3.17 MB Anexo template content.

### 3. Reorder template processing: DDJJ and Contrato first

Sort `templateContents` so that DDJJ and Contrato templates are processed before Anexo templates. This ensures critical signature documents are generated even if an Anexo fails.

### 4. Add diagnostic logging

Add `console.log` for each template processed (name + success/failure) so future issues can be diagnosed from console output.

### Files to modify
- `src/components/sale-form/SaleTemplatesTab.tsx` -- both `handleSendDocuments` (~lines 303-339) and `handleRegenerateDocuments` (~lines 610-631) loops

