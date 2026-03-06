

## Plan: Fase 4 — Bloque PAdES robusto con filtrado por rol, orden y re-firma

### Archivo único a modificar
`src/hooks/useSignatureLinkPublic.ts` — líneas 598-639

### Cambio
Reemplazar el bloque actual de post-firma (42 líneas) con la versión robusta (~90 líneas) que implementa:

1. **Fetch completo de docs**: incluye `beneficiary_id` y `signed_pdf_url` en el select
2. **Check de contratada pendiente**: query a `signature_links` para saber si existe un paso contratada en status `pendiente` — si existe, el contrato NO se firma aún
3. **Filtrado inteligente por `recipient_type`**:
   - **contratada** → solo firma contratos
   - **titular** → firma docs sin `beneficiary_id` y que no sean contrato (si hay contratada pendiente)
   - **adherente** → solo firma docs donde `beneficiary_id === data.recipient_id`
4. **Anti re-firma**: si `signed_pdf_url` ya existe, se salta el documento
5. **Authorization header**: incluido en ambos fetch (generate-base-pdf y pades-sign-document)

### Código resultante (reemplaza líneas 598-639)

```typescript
// Post-signature: generate base PDF + PAdES only when it actually corresponds
try {
  const supabaseUrl = SUPABASE_URL;
  const anonKey = SUPABASE_PUBLISHABLE_KEY;

  const { data: docs, error: docsErr } = await signatureClient
    .from('documents')
    .select('id, document_type, beneficiary_id, is_final, signed_pdf_url')
    .eq('sale_id', data.sale_id)
    .eq('is_final', true)
    .neq('document_type', 'firma');

  if (docsErr) {
    console.warn('Could not fetch final documents:', docsErr);
  } else if (docs && docs.length > 0) {
    const recipientType = data.recipient_type;

    let hasPendingContratada = false;
    try {
      const { data: pendingCL } = await signatureClient
        .from('signature_links')
        .select('id')
        .eq('sale_id', data.sale_id)
        .eq('recipient_type', 'contratada')
        .eq('status', 'pendiente');
      hasPendingContratada = !!(pendingCL && pendingCL.length > 0);
    } catch (e) {
      console.warn('Could not check pending contratada links:', e);
      hasPendingContratada = true;
    }

    const docsToSign = docs.filter((d: any) => {
      if (d.signed_pdf_url) return false;
      const dt = (d.document_type || '').toLowerCase();
      const isContract = dt === 'contrato' || dt === 'contract';

      if (recipientType === 'contratada') return isContract;
      if (recipientType === 'titular') {
        if (isContract && hasPendingContratada) return false;
        return d.beneficiary_id == null && !isContract;
      }
      if (recipientType === 'adherente') {
        return d.beneficiary_id != null && d.beneficiary_id === data.recipient_id;
      }
      return false;
    });

    for (const doc of docsToSign) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/generate-base-pdf`, { ... });
        await fetch(`${supabaseUrl}/functions/v1/pades-sign-document`, { ... });
      } catch (pdfErr) {
        console.warn(`PDF generation/signing failed for doc ${doc.id}:`, pdfErr);
      }
    }
  }
} catch (pdfGenErr) {
  console.warn('Post-signature PDF generation error:', pdfGenErr);
}
```

### Impacto
- Solo 1 archivo, 1 bloque reemplazado
- No afecta el bloque de activación de contratada (Fase 3)
- No requiere migraciones

