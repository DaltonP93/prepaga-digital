

# Mejorar overlay drag/resize/select en CanvasFieldOverlay

## Estado actual

`CanvasFieldOverlay.tsx` ya tiene drag, resize y selección básicos. Pero comparado con OpenSign (Placeholder.jsx + BorderResize.jsx) le faltan:

1. **Resize multi-handle** — Solo tiene handle bottom-right. OpenSign usa 4 esquinas + 4 bordes
2. **Tooltip de coordenadas** — No muestra posición/tamaño durante drag/resize
3. **Keyboard shortcuts** — No hay Delete/Backspace para eliminar campo seleccionado, ni Escape para deseleccionar
4. **Deselect on canvas click** — El overlay no propaga deselección al canvas padre
5. **Snap visual** — Sin guías de alineación durante drag
6. **currentPage filter** — No filtra campos por página actual

## Cambios

### 1. `CanvasFieldOverlay.tsx` — Reescribir

- **8 handles de resize**: 4 esquinas (nwse, nesw, nwse, nesw) + 4 bordes (ns, ew, ns, ew), cada uno con cursor correcto
- **Tooltip durante drag/resize**: Muestra `x: 45% y: 72%` o `w: 20% h: 6%` como badge flotante
- **Filtro por `currentPage`**: Solo muestra campos donde `field.page === currentPage`
- **Keyboard**: `Delete`/`Backspace` = eliminar campo seleccionado, `Escape` = deseleccionar
- **Click en vacío** = deseleccionar (callback `onDeselectAll`)
- **meta.normalized** se actualiza en cada persistencia (ya existe, se mantiene)

### 2. `OpenSignCanvas.tsx` — Pasar `currentPage` al overlay

- Agregar prop `currentPage` a `CanvasFieldOverlay`
- Pasar callback `onDeselectAll` para limpiar selección de bloques también

### 3. Props nuevas de `CanvasFieldOverlay`

```text
+ currentPage: number
+ onFieldSelect?: (fieldId: string | null) => void
```

## Archivos

| Archivo | Cambio |
|---------|--------|
| `src/components/designer2/CanvasFieldOverlay.tsx` | Reescribir con multi-handle resize, tooltip, keyboard, page filter |
| `src/components/designer2/opensign/OpenSignCanvas.tsx` | Pasar `currentPage` y `onFieldSelect` al overlay |

## No se toca
- `useTemplateFields` hooks
- `template_fields` schema
- `OpenSignRightPanel.tsx`
- `FieldOverlay.tsx`

