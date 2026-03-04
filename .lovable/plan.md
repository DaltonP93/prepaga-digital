

## Plan: Firmantes por Rol — Filtrado de Documentos y Bloque de Firma del Contrato

### Problema Actual
1. **Contratada** ve todos los documentos (no hay filtro para `recipient_type === 'contratada'`). Deberia ver solo el Contrato.
2. **Contratante (titular)** ve el Contrato + DDJJ + Anexos, pero el bloque de firma del contrato agrega CONTRATADA automáticamente incluso cuando firma el titular, y viceversa.
3. **Adherente** funciona correctamente (solo ve su DDJJ por `beneficiary_id`).
4. El bloque de firma del contrato no separa correctamente la firma CONTRATANTE (solo cuando firma el titular) de la firma CONTRATADA (solo cuando firma la contratada). Actualmente se agrega el bloque CONTRATADA al momento que firma el titular.

### Cambios Planificados

**1. `src/hooks/useSignatureLinkPublic.ts` — Filtrado de documentos para contratada**

En `useSignatureLinkDocuments` (~línea 602):
- Agregar condición `else if (recipientType === 'contratada')` que filtre solo documentos de tipo `contrato` (sin `beneficiary_id`), excluyendo DDJJ y anexos.

En `useSubmitSignatureLink` — query de docs para firmar (~línea 301):
- Agregar la misma lógica: si `recipientType === 'contratada'`, filtrar `document_type = 'contrato'` y `beneficiary_id IS NULL`.

**2. `src/hooks/useSignatureLinkPublic.ts` — Bloques de firma separados por rol**

Actualmente (línea ~483-497), el bloque CONTRATADA se agrega siempre que firma cualquier persona. Cambiar la lógica:

- **Cuando firma el TITULAR**: insertar solo el bloque CONTRATANTE (sin el bloque CONTRATADA). La CONTRATADA firmará en su propio flujo.
- **Cuando firma la CONTRATADA**: insertar solo el bloque CONTRATADA en el documento.
- **Cuando firma un ADHERENTE**: mantener comportamiento actual (solo su firma en su DDJJ, sin bloques de contrato).

El bloque CONTRATADA solo se agrega al documento del contrato cuando `recipientType === 'contratada'`.

**3. Formato profesional del bloque de firma del contrato (según PDF de referencia)**

El PDF subido muestra un formato con:
- Línea separadora larga `________________________________`
- Label centrado: `CONTRATANTE` o `CONTRATADA`  
- Línea: `Aclaración:...................................`
- Línea: `C.I.Nº:...................................`

Actualizar el bloque v2.0 para incluir el campo "Aclaración" (nombre completo) además del C.I., replicando el formato del PDF de referencia.

**4. Documento final completo**

Cuando **ambas partes** hayan firmado el contrato (titular + contratada), el documento final del contrato contendrá ambos bloques lado a lado. Esto se logra verificando si ya existe un documento final firmado por la otra parte y fusionando los bloques.

### Resumen de Filtrado por Firmante

```text
┌─────────────┬──────────────────────────────┬──────────────┐
│ Firmante    │ Ve / Firma                   │ Bloque firma │
├─────────────┼──────────────────────────────┼──────────────┤
│ Contratada  │ Solo Contrato                │ CONTRATADA   │
│ Titular     │ Contrato + DDJJ + Anexos     │ CONTRATANTE  │
│ Adherente   │ Solo su DDJJ                 │ ADHERENTE    │
└─────────────┴──────────────────────────────┴──────────────┘
```

### Archivos a Modificar
- `src/hooks/useSignatureLinkPublic.ts` — Filtrado de docs por `contratada`, separación de bloques de firma, formato profesional con "Aclaración"

