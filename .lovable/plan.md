

# Plan: Fixes completos del análisis ANALISIS_LOVABLE_RESULTADO.md

## Diagnóstico confirmado

1. **template_fields está vacía** — Los campos se crean visualmente pero no persisten. RLS policies existen y son correctas (company_id match). El problema probable es que `createField.mutate()` no tiene `onError` visible en `CanvasFieldOverlay.tsx` (líneas 119-129 y 215-222) — los errores se silencian.
2. **PDF pixelado** — `AssetUploadModal.tsx` usa `THUMB_SCALE = 0.5` (línea 183). Los thumbnails del sidebar están bien a ese tamaño pero el canvas central usa esas mismas imágenes de baja resolución como background.
3. **Solo una página visible** — El canvas muestra `currentPage` solamente, no scroll de todas las páginas apiladas.
4. **Sin botón eliminar/reemplazar PDF** — No existe en ningún componente.
5. **blocks ↔ content no sincroniza** — Al guardar en V2, `TemplateForm.onSubmit` guarda `data.content` (el campo del form) pero el V2 editor nunca actualiza ese campo con el contenido de los bloques.

## Cambios a implementar

### A. Fix crítico: campos no se guardan (error handling)

**Archivos:** `src/components/designer2/CanvasFieldOverlay.tsx`

- En `createField.mutate()` (click-to-place, línea 119 y native drop, línea 215): agregar `onError` callback con `console.error` + toast.
- En `updateField.mutate()` (línea 172): agregar `onError` con toast.
- En `deleteField.mutate()` (línea 193 y 324): agregar `onError` con toast.
- Esto hará visibles los errores RLS si existen.

**Archivo:** `src/hooks/useTemplateFields.ts`
- Verificar que el `useCreateTemplateField` ya tiene `onError` (sí lo tiene, línea 45). Agregar logging adicional del payload para debug.

### B. PDF nítido en canvas (scale 2x)

**Archivo:** `src/components/designer2/AssetUploadModal.tsx`

- Cambiar `THUMB_SCALE` de `0.5` a `1.5` para generar thumbnails de mayor resolución.
- Los thumbnails del sidebar seguirán viéndose bien (se escalan con CSS).
- El canvas central usará imágenes más nítidas como background.

### C. Scroll de todas las páginas en canvas

**Archivo:** `src/components/designer2/opensign/OpenSignCanvas.tsx`

- En lugar de renderizar solo `currentPage`, renderizar TODAS las páginas apiladas verticalmente con scroll.
- Cada página es un bloque A4 con su propio `CanvasFieldOverlay`.
- Al hacer scroll, detectar qué página está visible y actualizar `currentPage` (IntersectionObserver).
- Mantener el click en sidebar para scroll automático (`scrollIntoView`).

**Cambios al componente:**
- Recibir nueva prop: `pageBackgrounds: Record<number, string>` (en lugar de solo `pageBackgroundUrl`).
- Renderizar `Array.from({length: totalPages})` con cada página como div A4.
- Cada página tiene su propio `CanvasFieldOverlay` con `currentPage={pageNum}`.
- Usar `ref` por página + IntersectionObserver para sincronizar `currentPage`.

**Archivo:** `src/components/designer2/opensign/OpenSignTemplateEditor.tsx`
- Resolver signed URLs para TODAS las páginas (no solo la actual).
- Pasar `pageBackgrounds` map al canvas en vez de `currentPageBackground`.

### D. Botón eliminar/reemplazar PDF

**Archivo:** `src/components/designer2/opensign/OpenSignCanvas.tsx`

- En el `CanvasToolbar`, si hay un PDF cargado (totalPages > 0), mostrar botón "Eliminar documento" con ícono Trash2.
- Prop nueva: `onDeleteAsset?: () => void`, `hasAsset?: boolean`.

**Archivo:** `src/components/designer2/opensign/OpenSignTemplateEditor.tsx`
- Handler `handleDeleteAsset`: usa `useDeleteTemplateAsset` para eliminar el asset + sus bloques asociados.
- También eliminar los `template_asset_pages` y bloques tipo `pdf_embed`/`attachment_card` vinculados.
- Pasar `onDeleteAsset` y `hasAsset` al canvas.

### E. Sincronización blocks → templates.content al guardar

**Archivo:** `src/components/designer2/opensign/OpenSignTemplateEditor.tsx`
- Agregar prop `onContentSync?: (html: string) => void`.
- Crear función que serializa los bloques V2 a HTML básico (headings → `<h2>`, text → html content, etc.) para mantener `templates.content` actualizado.
- Llamar `onContentSync` cuando el usuario hace "Guardar" desde el toolbar.

**Archivo:** `src/components/TemplateForm.tsx`
- Pasar `onContentSync` al `OpenSignTemplateEditor`.
- Cuando V2 sincroniza, llamar `setValue("content", html)` para que el form guarde el contenido.
- Conectar el botón "Guardar" del canvas toolbar al `handleSubmit` del form.

### F. Botón Guardar/Preview funcionales en toolbar

**Archivo:** `src/components/designer2/opensign/OpenSignTemplateEditor.tsx`
- Pasar `onSave` y `onPreview` al `OpenSignCanvas`.
- `onSave`: ejecutar sincronización de contenido y luego triggear el submit del form padre.
- `onPreview`: abrir vista previa del PDF.

**Archivo:** `src/components/TemplateForm.tsx`
- Exponer `handleSubmit` como ref o callback para que el editor V2 pueda triggearlo.
- Pasar `templateName` y `onTemplateNameChange` al editor V2 para el nombre editable en toolbar.

## Resumen de archivos

| Archivo | Cambios |
|---------|---------|
| `src/components/designer2/CanvasFieldOverlay.tsx` | Error handling en mutaciones |
| `src/components/designer2/AssetUploadModal.tsx` | THUMB_SCALE → 1.5 |
| `src/components/designer2/opensign/OpenSignCanvas.tsx` | Scroll multi-página, botón eliminar PDF |
| `src/components/designer2/opensign/OpenSignTemplateEditor.tsx` | Resolver todas las URLs, delete asset, save/preview, content sync |
| `src/components/TemplateForm.tsx` | Conectar save/preview/name del V2 editor |

## Orden de implementación

1. Fix A (error handling) — visibilidad de errores
2. Fix B (PDF scale) — mejora visual rápida  
3. Fix C (scroll páginas) — cambio más grande
4. Fix D (eliminar PDF) — complementa scroll
5. Fix E + F (sync content + save/preview) — integración completa

