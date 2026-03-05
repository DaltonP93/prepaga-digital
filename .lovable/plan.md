

## Plan: Fase 3 — Bloque contratada corregido + company name dinámico

### Archivo único a modificar
`src/hooks/useSignatureLinkPublic.ts` — líneas 641-695

### Cambio
Reemplazar el bloque completo de activación de contratada con la versión corregida del usuario. Diferencias clave vs. código actual:

1. **Separar queries**: primero `sales.company_id`, luego `companies.name` como query independiente (evita el join `companies:company_id(name)` que puede fallar con RLS en contexto público)
2. **Authorization header**: agregar `Authorization: Bearer ${SUPABASE_PUBLISHABLE_KEY}` al fetch de `send-whatsapp`
3. **Guard mejorado**: mover el check de `recipient_phone` ANTES del fetch con `continue` explícito y log de warning con `linkId`
4. **Sin recipient_name en query**: simplificar select a `id, token, recipient_phone` (el nombre se hardcodea como "Representante" ya que viene de config empresa)
5. **companyName dinámico**: query separada a `companies` por `companyId` para obtener nombre real en vez de hardcodear "Prepaga Digital"

### Código resultante (líneas 641-723)

```typescript
// Activate contratada link if titular just completed
if (data.recipient_type === 'titular') {
  try {
    const { data: saleRow, error: saleErr } = await signatureClient
      .from('sales')
      .select('id, company_id')
      .eq('id', data.sale_id)
      .single();

    if (saleErr || !saleRow?.company_id) {
      console.warn('Could not fetch sale.company_id for WhatsApp:', saleErr);
    } else {
      const companyId = saleRow.company_id as string;

      const { data: company } = await signatureClient
        .from('companies')
        .select('name')
        .eq('id', companyId)
        .single();

      const { data: contratadaLinks, error: clErr } = await signatureClient
        .from('signature_links')
        .select('id, token, recipient_phone')
        .eq('sale_id', data.sale_id)
        .eq('recipient_type', 'contratada')
        .eq('status', 'pendiente');

      if (clErr) console.warn('Could not fetch contratada links:', clErr);

      if (contratadaLinks && contratadaLinks.length > 0) {
        for (const cl of contratadaLinks) {
          await signatureClient
            .from('signature_links')
            .update({ is_active: true } as any)
            .eq('id', cl.id);

          try {
            if (!cl.recipient_phone) {
              console.warn('No recipient_phone for contratada link', { linkId: cl.id });
              continue;
            }
            const linkUrl = `${window.location.origin}/firmar/${cl.token}`;
            await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_PUBLISHABLE_KEY,
                'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({
                to: cl.recipient_phone,
                templateName: 'signature_link',
                templateData: {
                  clientName: 'Representante',
                  companyName: company?.name || 'Empresa',
                  signatureUrl: linkUrl,
                },
                saleId: data.sale_id,
                companyId,
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

### Impacto
- Solo 1 archivo, 1 bloque de ~55 líneas reemplazado por ~70 líneas
- No afecta el bloque de PAdES condicional (ya corregido en Fase 2)
- No requiere migraciones ni cambios en Edge Functions

