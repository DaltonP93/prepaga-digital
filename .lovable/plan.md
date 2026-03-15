

# Integrar OpenSignTemplateEditor como editor principal V2

## Resumen

Tres cambios concretos para activar el editor OpenSign como editor principal cuando `designer_version === '2.0'`, con soporte de signed URLs para miniaturas privadas.

## Cambios

### 1. `TemplateForm.tsx` — Líneas 26, 344-348

- Reemplazar el lazy import de `TemplateDesigner2` por `OpenSignTemplateEditor`
- En el condicional `designer_version === "2.0"`, renderizar `OpenSignTemplateEditor` en lugar de `TemplateDesigner2`

### 2. `OpenSignTemplateEditor.tsx` — Computed pages con signed URLs

- Las `preview_image_url` de `template_asset_pages` son storage paths (no URLs públicas)
- Agregar un `useEffect` que resuelve signed URLs para cada `assetPage.preview_image_url` usando `getAssetSignedUrl` de `src/lib/assetUrlHelper.ts`
- Almacenar las URLs resueltas en un state `resolvedPages: PageEntry[]` que se pasa al sidebar
- Detectar si la URL ya es absoluta (empieza con `http`) para no firmarla innecesariamente

### 3. `OpenSignCanvas.tsx` — Background de página con miniatura

- Cuando la página actual tiene `previewUrl` (miniatura del PDF), renderizarla como `background-image` del contenedor A4
- Esto da contexto visual de la página PDF real debajo de los overlays de campos
- Recibir `pageBackgroundUrl` como prop desde el editor padre

## Archivos

| Archivo | Cambio |
|---------|--------|
| `src/components/TemplateForm.tsx` | Swap lazy import + render de OpenSignTemplateEditor |
| `src/components/designer2/opensign/OpenSignTemplateEditor.tsx` | Resolver signed URLs para miniaturas, pasar background al canvas |
| `src/components/designer2/opensign/OpenSignCanvas.tsx` | Renderizar background de página PDF |

## No se toca
- `TemplateDesigner2.tsx` (queda como archivo legacy)
- Backend / Edge Functions
- `CanvasFieldOverlay.tsx`
- `OpenSignRightPanel.tsx`
- `OpenSignPagesSidebar.tsx`

