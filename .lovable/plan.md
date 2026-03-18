

## Plan: Fase 5 — PAdES con document_type exactos y doble safeguard

### Archivo único
`src/hooks/useSignatureLinkPublic.ts` — líneas 598-682

### Cambio
Reemplazar el bloque PAdES actual por la versión con valores exactos de `document_type` (`contrato`, `ddjj_salud`, `anexo`) en lugar de comparaciones genéricas con `.toLowerCase()`. Agrega doble safeguard para contratada pendiente.

### Diferencias clave vs. código actual (Fase 4)

1. **document_type exacto**: usa `dt === 'contrato'` directo (sin `.toLowerCase()` ni check de `'contract'`)
2. **ddjj_salud explícito**: filtra por `dt === 'ddjj_salud'` en vez de "todo lo que no sea contrato"
3. **Anexos excluidos**: `dt === 'anexo'` retorna `false` explícitamente
4. **Doble safeguard**: `safeDocsToSign` filtra contrato si `hasPendingContratada` como segunda capa
5. **Error handling mejorado**: `pendingErr` se maneja separadamente del catch

### Código resultante (reemplaza líneas 598-682)

```typescript
// Post-signature: generate base PDF + PAdES only when it corresponds to this signer + step
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
      const { data: pendingCL, error: pendingErr } = await signatureClient
        .from('signature_links').select('id')
        .eq('sale_id', data.sale_id)
        .eq('recipient_type', 'contratada')
        .eq('status', 'pendiente');
      if (pendingErr) {
        console.warn('Could not check pending contratada links:', pendingErr);
        hasPendingContratada = true;
      } else {
        hasPendingContratada = !!(pendingCL && pendingCL.length > 0);
      }
    } catch (e) {
      console.warn('Could not check pending contratada links (exception):', e);
      hasPendingContratada = true;
    }

    const docsToSign = docs.filter((d: any) => {
      if (d.signed_pdf_url) return false;
      const dt = d.document_type;

      if (dt === 'contrato') {
        return recipientType === 'contratada';
      }
      if (dt === 'ddjj_salud') {
        if (recipientType === 'titular') return d.beneficiary_id == null;
        if (recipientType === 'adherente') return d.beneficiary_id != null && d.beneficiary_id === data.recipient_id;
        return false;
      }
      if (dt === 'anexo') return false;
      return false;
    });

    const safeDocsToSign = docsToSign.filter((d: any) => {
      if (d.document_type === 'contrato' && hasPendingContratada) return false;
      return true;
    });

    for (const doc of safeDocsToSign) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/generate-base-pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` },
          body: JSON.stringify({ document_id: doc.id }),
        });
        await fetch(`${supabaseUrl}/functions/v1/pades-sign-document`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` },
          body: JSON.stringify({ document_id: doc.id }),
        });
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
- 1 archivo, 1 bloque (~85 líneas reemplaza ~85 líneas)
- No afecta bloque de activación contratada (Fase 3)
- No requiere migraciones

