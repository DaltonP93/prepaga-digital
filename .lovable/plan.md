

## Plan: Firma Electrónica v2.0 — Bloque Compacto Profesional

### Problema Actual
El bloque de firma electrónica actual es muy extenso: incluye UUID, hash SHA-256, IP, dispositivo, y texto legal largo. Ocupa demasiado espacio en el PDF final y no se ve profesional.

### Referencia Deseada (firma_electronica_otro.pdf)
El diseño de referencia muestra un bloque limpio y compacto:

```text
Firmado electrónicamente por: raquel velazquez
Fecha: 22.01.2026 11:30:18
________________________________
        CONTRATANTE
C.I.Nº: .............................
```

Lado a lado con el bloque de la CONTRATADA con el mismo formato.

### Cambios

**1. `src/hooks/useSignatureLinkPublic.ts`** — Reemplazar el bloque de firma electrónica (líneas ~357-401):

- **Bloque actual**: Tabla con 7 filas (firmante, fecha, ref documento UUID, IP, dispositivo, hash SHA-256, texto legal).
- **Bloque nuevo v2.0**: Formato compacto de 3 líneas máximo:
  - "Firmado electrónicamente por: [nombre completo]"
  - "Fecha: [DD.MM.YYYY HH:MM:SS]"
  - Línea separadora + label "CONTRATANTE" + "C.I.Nº: [número]"
- Los metadatos técnicos (IP, hash, dispositivo, UUID) se seguirán guardando en `process_traces` y `signature_evidence_bundles` para auditoría, pero **no se mostrarán en el documento visible**.
- Se necesitará pasar los datos del cliente (nombre, CI) al bloque, disponibles en `data` (sale con joins a clients).

**2. Bloque CONTRATADA** (líneas ~477-484):
- Aplicar el mismo formato visual compacto:
  - "Firmado electrónicamente por: [representante nombre]"
  - "Fecha: [DD.MM.YYYY HH:MM:SS]"
  - Línea separadora + label "CONTRATADA" + "C.I.Nº: [tax_id]"
- Layout lado a lado (inline-block o flex) para CONTRATANTE y CONTRATADA en la misma línea, como en el PDF de referencia.

**3. `src/components/editor/SignatureFieldExtension.tsx`** — Actualizar la vista previa del editor:
- Simplificar el preview del bloque electrónico para reflejar el nuevo formato compacto v2.0.
- Quitar las filas de Token, RFC/ISO/eIDAS del preview visual.
- Mostrar: "Firmado electrónicamente por: [variable]" + "Fecha: [timestamp]".

### Datos técnicos preservados
La información de auditoría (IP, hash, UUID, user agent) se mantiene intacta en:
- Tabla `process_traces` (ya se graba en línea 523-536)
- Tabla `signature_evidence_bundles` / `hash_anchors`
- Solo se elimina del **bloque visual** del documento PDF.

