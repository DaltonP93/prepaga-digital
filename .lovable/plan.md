

## Plan: Fase 2 — Correcciones de lógica post-firma y companyId en WhatsApp

### Resumen
Tres cambios principales:
1. **Post-firma condicional**: el contrato NO se firma con PAdES cuando firma el titular; solo cuando firma la contratada (último paso). DDJJ se firma inmediatamente.
2. **companyId real en WhatsApp**: obtener `company_id` de `sales` antes de enviar la notificación.
3. **companyName real**: usar el nombre de la empresa desde `companies` en lugar de hardcodear "Prepaga Digital".

---

### Cambio 1: Lógica condicional de PDF post-firma

**Archivo**: `src/hooks/useSignatureLinkPublic.ts` (líneas 598-633)

Reemplazar el bloque actual que genera PDF base + PAdES para TODOS los `finalDocs` indiscriminadamente.

Nueva lógica:
```typescript
// Post-signature: generate base PDF + PAdES (conditional by document type)
try {
  // Determine which documents to sign with PAdES now
  let pdfQuery = signatureClient
    .from('documents')
    .select('id, document_type')
    .eq('sale_id', data.sale_id)
    .eq('is_final', true)
    .neq('document_type', 'firma');

  if (data.recipient_type === 'titular') {
    // Titular: only sign DDJJ (not contrato — that waits for contratada)
    pdfQuery = pdfQuery.neq('document_type', 'contrato');
  } else if (data.recipient_type === 'adherente') {
    // Adherente: only their own DDJJ (by beneficiary_id)
    pdfQuery = pdfQuery.eq('beneficiary_id', data.recipient_id);
  }
  // contratada: signs everything remaining (contrato included)

  const { data: finalDocs } = await pdfQuery;

  if (finalDocs && finalDocs.length > 0) {
    for (const finalDoc of finalDocs) {
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/generate-base-pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_PUBLISHABLE_KEY },
          body: JSON.stringify({ document_id: finalDoc.id }),
        });
        await fetch(`${SUPABASE_URL}/functions/v1/pades-sign-document`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_PUBLISHABLE_KEY },
          body: JSON.stringify({ document_id: finalDoc.id }),
        });
      } catch (pdfErr) {
        console.warn(`PDF generation failed for doc ${finalDoc.id}:`, pdfErr);
      }
    }
  }
} catch (pdfGenErr) {
  console.warn('Post-signature PDF generation error:', pdfGenErr);
}
```

Resultado:
- **Titular firma** → PAdES solo para DDJJ titular (no contrato)
- **Adherente firma** → PAdES solo para su DDJJ específica
- **Contratada firma** → PAdES para contrato (y cualquier doc restante)

---

### Cambio 2: companyId y companyName reales en WhatsApp

**Archivo**: `src/hooks/useSignatureLinkPublic.ts` (líneas 635-681)

El bloque de activación de contratada necesita obtener `company_id` y `company.name` de `sales`. Dado que este fetch ya se hace arriba (línea 337), podemos mover la variable `saleInfo` a un scope más amplio, o hacer una query ligera aquí.

Opción más limpia: query ligera dentro del bloque:

```typescript
if (data.recipient_type === 'titular') {
  try {
    // Get company info for WhatsApp payload
    const { data: saleForWa } = await signatureClient
      .from('sales')
      .select('company_id, companies:company_id(name)')
      .eq('id', data.sale_id)
      .single();

    const { data: contratadaLinks } = await signatureClient
      .from('signature_links')
      .select('id, token, recipient_phone, recipient_name')
      .eq('sale_id', data.sale_id)
      .eq('recipient_type', 'contratada')
      .eq('status', 'pendiente');

    if (contratadaLinks && contratadaLinks.length > 0) {
      for (const cl of contratadaLinks) {
        await signatureClient
          .from('signature_links')
          .update({ is_active: true } as any)
          .eq('id', cl.id);

        if (cl.recipient_phone) {
          try {
            const linkUrl = `${window.location.origin}/firmar/${cl.token}`;
            await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_PUBLISHABLE_KEY,
              },
              body: JSON.stringify({
                to: cl.recipient_phone,
                templateName: 'signature_link',
                templateData: {
                  clientName: cl.recipient_name || 'Representante',
                  companyName: (saleForWa as any)?.companies?.name || 'Empresa',
                  signatureUrl: linkUrl,
                },
                companyId: (saleForWa as any)?.company_id || '',
                saleId: data.sale_id,
                messageType: 'signature_link',
              }),
            });
          } catch (waErr) {
            console.warn('WhatsApp notification to contratada failed:', waErr);
          }
        }
      }
    }
  } catch (activateErr) {
    console.warn('Could not activate contratada links:', activateErr);
  }
}
```

---

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/hooks/useSignatureLinkPublic.ts` (L598-633) | Post-firma condicional: excluir contrato para titular, filtrar por beneficiary_id para adherente |
| `src/hooks/useSignatureLinkPublic.ts` (L635-681) | WhatsApp: agregar query de company_id/name, usar companyId real, messageType, companyName dinámico |

### No se toca
- `SignatureView.tsx` — ya corregido en Fase 1
- `get-document-download-url` — ya corregido en Fase 1
- Edge Functions server-side — no requieren cambios

