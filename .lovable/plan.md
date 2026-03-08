

## Fix: DDJJ Unicode normalization bug

The `isDDJJ` detection uses `lower.includes('declaración')` which can fail due to Unicode encoding differences. The fix adds NFD normalization to ensure reliable matching regardless of how the accent is encoded.

### Changes in `src/components/sale-form/SaleTemplatesTab.tsx`

**3 locations to fix:**

1. **Line 318** (handleSendDocuments): Add `lowerNorm` with NFD normalization alongside existing check
2. **Lines 364-366** (ddjiTemplates filter): Add normalized variant to the filter
3. **Line 647** (handleRegenerateDocuments): Same NFD normalization fix as #1

Each fix adds:
```typescript
const lowerNorm = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
```
And extends the boolean to include `lowerNorm.includes('declaracion')`.

No other files need changes.

