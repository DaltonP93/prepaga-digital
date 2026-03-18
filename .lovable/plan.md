

# Plan: Fix campos V2 + Build errors

## Cambios

### 1. Fix `useWidgetDrag` — buscar páginas por `data-a4-page` en vez de `pageSelector`

El hook actual usa `document.querySelector(pageSelector)` que solo encuentra UNA página. Reemplazar `getDropCoordinates` para iterar sobre TODAS las páginas con `querySelectorAll('[data-a4-page="true"]')`, detectar cuál recibe el drop, y calcular coordenadas relativas. Eliminar la prop `pageSelector` ya que no se necesita.

**Archivo:** `src/hooks/useWidgetDrag.ts`

### 2. Fix `OpenSignCanvas` — wrapper sin transform para coordenadas correctas

`getBoundingClientRect()` en un elemento con `transform: scale()` devuelve el tamaño escalado, pero las coordenadas internas del canvas son a 794×1123. Separar en dos divs:
- Wrapper externo: `data-a4-page`, `data-page-num`, tamaño visual escalado, sin transform
- Div interno: tamaño A4 real, `transform: scale()`, contiene bloques y background
- `CanvasFieldOverlay` se mueve al wrapper externo (fuera del scale)

**Archivo:** `src/components/designer2/opensign/OpenSignCanvas.tsx`

### 3. Fix `CanvasFieldOverlay` coordenadas

Ya está correcto porque usa `overlayRef.current.getBoundingClientRect()` — al moverlo fuera del div escalado, las coordenadas de click serán correctas automáticamente.

### 4. Build errors en Edge Functions

- `compose-template-pdf`: cast `pdfBytes` a `Uint8Array` → usar `new Blob([pdfBytes])` y type `err` as `any`
- `publish-template-version`: type `err` as `any`
- `upload-template-asset`: type `err` as `any`

**Archivos:** 3 edge functions

### 5. Actualizar `OpenSignTemplateEditor` — quitar `pageSelector`

Eliminar la prop `pageSelector` del llamado a `useWidgetDrag`.

**Archivo:** `src/components/designer2/opensign/OpenSignTemplateEditor.tsx`

