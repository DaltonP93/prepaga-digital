

# Mejorar UX visual del editor V2 estilo OpenSign

## Diagnóstico

El editor ya tiene la estructura de 3 columnas, roles como cards, grid de widgets, y 8 handles de resize. Lo que falta:

1. **`selectedFieldId` no sube al editor** — vive solo dentro de `CanvasFieldOverlay`, el panel Props no puede mostrar propiedades del field seleccionado
2. **Toolbar sin fit-width / fit-page** — solo tiene zoom +/-
3. **Canvas con fondo poco profesional** — necesita fondo más oscuro/neutro tipo OpenSign
4. **Props tab ignora fields** — solo muestra propiedades de bloques, nunca de fields
5. **Sidebar sin indicador de fields por página**

## Cambios

### 1. `OpenSignTemplateEditor.tsx` — Levantar `selectedFieldId`

- Nuevo state `selectedFieldId: string | null`
- Pasarlo a `OpenSignCanvas` → `CanvasFieldOverlay` como prop controlada
- Pasarlo a `OpenSignRightPanel` para que Props muestre field properties
- Cuando se selecciona un field, deseleccionar block y viceversa

### 2. `OpenSignCanvas.tsx` — Toolbar mejorada + fondo profesional

- Agregar botones **Fit Width** (calcula zoom para que A4_W quepa en el container) y **Fit Page** (A4_H quepa)
- Fondo del área de scroll: `bg-neutral-200 dark:bg-neutral-900` (tipo OpenSign)
- Sombra más pronunciada en la página A4
- Pasar `selectedFieldId` y `onFieldSelect` al overlay como props controladas
- Agregar separador visual entre zoom y página en toolbar

### 3. `CanvasFieldOverlay.tsx` — Selección controlada desde padre

- Cambiar `selectedFieldId` interno a prop controlada (`selectedFieldId` + `onFieldSelect`)
- Mantener toda la lógica de drag/resize/keyboard intacta
- Mejorar visual: borde más grueso (2.5px) cuando seleccionado, sombra `ring` del color del rol

### 4. `OpenSignRightPanel.tsx` — Props tab con soporte de fields

- Recibir nuevas props: `selectedFieldId`, `fields`, callbacks de update/delete field
- En tab Props: si hay `selectedFieldId` → mostrar panel de propiedades del field (label, required, field_type, signer_role, coordenadas)
- Si no hay field seleccionado pero hay block → mostrar `BlockPropertyPanel` como ahora
- Si no hay nada → estado vacío con tip

### 5. `OpenSignPagesSidebar.tsx` — Badge de fields por página

- Recibir `fields` como prop
- Mostrar badge con cantidad de fields en cada miniatura de página

## Archivos

| Archivo | Cambio |
|---------|--------|
| `OpenSignTemplateEditor.tsx` | Levantar `selectedFieldId`, pasar a canvas y right panel |
| `OpenSignCanvas.tsx` | Fit width/page, fondo neutro, forward `selectedFieldId` |
| `CanvasFieldOverlay.tsx` | Selección controlada por prop |
| `OpenSignRightPanel.tsx` | Props tab muestra field properties o block properties |
| `OpenSignPagesSidebar.tsx` | Badge de fields por página |

## No se toca
- Backend / edge functions
- `FieldOverlay.tsx` (tab Campos)
- `BlockPropertyPanel.tsx`
- Hooks de `useTemplateFields`

