

# Migración UI tipo OpenSign → Template Designer 2.0

## Resumen

Crear 4 componentes nuevos bajo `src/components/designer2/opensign/` que replican el layout de OpenSign (páginas izquierda, canvas centro, panel roles/campos derecha) pero conectados al backend existente de Supabase (`template_blocks`, `template_fields`, `template_assets`, `template_asset_pages`).

El `TemplateDesigner2.tsx` actual NO se modifica — los nuevos componentes son una vista alternativa que el usuario puede elegir o que se activa para templates basados en PDF.

## Layout objetivo

```text
┌──────────┬────────────────────────┬───────────────┐
│ Pages    │   Canvas/PDF Viewer    │  Right Panel  │
│ sidebar  │                        │               │
│          │   [A4 page or PDF]     │  Tab: Roles   │
│ thumb 1  │   [field overlays]     │  Tab: Campos  │
│ thumb 2  │   [drag/resize]        │  Tab: Props   │
│ thumb 3  │                        │  Tab: Version │
│          │   zoom + nav bar       │               │
└──────────┴────────────────────────┴───────────────┘
```

## Componentes a crear

### 1. `OpenSignTemplateEditor.tsx` — Orquestador principal

- Layout: `grid grid-cols-[200px_1fr_280px]`
- Estado compartido: `currentPage`, `zoom`, `selectedFieldId`, `placementMode`, `activeRole`, `activeFieldType`
- Conecta hooks existentes: `useTemplateBlocks`, `useTemplateFields`, `useTemplateAssets` (del proyecto actual, no de OpenSign)
- Calcula páginas: usa `template_asset_pages` si hay PDF embebido, o genera páginas virtuales a partir de bloques de flujo
- Props: `templateId`, `legacyContent?`

### 2. `OpenSignPagesSidebar.tsx` — Miniaturas de páginas (izquierda)

Inspirado en `RenderAllPdfPage.jsx` pero sin `react-pdf` (que OpenSign usa). En su lugar:
- Si hay `template_asset_pages` con `preview_image_url`: muestra miniaturas reales
- Si no (contenido HTML/bloques): muestra rectángulos numerados con mini-preview
- Página activa resaltada con borde azul
- Click para cambiar `currentPage`
- Scroll vertical con `ScrollArea`

### 3. `OpenSignCanvas.tsx` — Área central de visualización

Combina lo que el proyecto ya tiene en `TemplateDesigner2.tsx` (canvas A4 + flow blocks + positioned blocks + `CanvasFieldOverlay`) en un componente más limpio:
- Toolbar superior: zoom in/out, página actual / total, badge de modo inserción
- Contenedor A4 con `position: relative`
- Renderiza flow blocks (text, heading, table) en stack vertical
- Renderiza positioned blocks en absolute
- Renderiza `CanvasFieldOverlay` para template_fields
- Ghost preview cuando `placementMode` activo
- Recibe estado del padre (zoom, page, insertMode, etc.)

### 4. `OpenSignRightPanel.tsx` — Panel derecho con tabs

4 tabs usando el componente `Tabs` de shadcn:

**Tab "Firmantes"** (nuevo, inspirado en SignerListPlace de OpenSign):
- Lista de roles definidos (Titular, Contratada, Adherente)
- Cada rol con color distintivo (azul, púrpura, verde)
- Indicador de cuántos campos tiene cada rol
- Click para seleccionar rol activo → los campos de ese rol se resaltan en canvas

**Tab "Campos"**: Reutiliza la lógica de `FieldOverlay.tsx` actual
- Grid de tipos de campo (signature, name, date, text, checkbox, etc.)
- Toggle "Colocar en canvas"
- Selector de rol activo

**Tab "Propiedades"**: Reutiliza `BlockPropertyPanel` existente para bloque seleccionado, o muestra propiedades del field seleccionado

**Tab "Versiones"**: Reutiliza `VersionPanel` existente

## Conexión con backend existente

No se crea nada nuevo en backend. Se reutiliza:
- `useTemplateBlocks` → bloques de contenido
- `useTemplateFields` + `useCreateTemplateField` + `useUpdateTemplateField` + `useDeleteTemplateField` → campos overlay
- `useTemplateAssets` → assets del template
- `useTemplateBlocks` queries con filtro de `page`

## Datos de prueba

Como solo hay contenido HTML legacy (no PDFs cargados), el sidebar de páginas mostrará páginas virtuales basadas en los bloques existentes. Cuando se cargue un PDF como asset, automáticamente mostrará las miniaturas reales de `template_asset_pages`.

## Archivos

| Archivo | Acción |
|---------|--------|
| `src/components/designer2/opensign/OpenSignTemplateEditor.tsx` | Crear |
| `src/components/designer2/opensign/OpenSignPagesSidebar.tsx` | Crear |
| `src/components/designer2/opensign/OpenSignCanvas.tsx` | Crear |
| `src/components/designer2/opensign/OpenSignRightPanel.tsx` | Crear |

## Lo que NO se toca
- `TemplateDesigner2.tsx` (queda como está)
- Backend / Edge Functions
- `template_blocks` / `template_fields` schema
- `legacyToBlocks.ts`
- `CanvasFieldOverlay.tsx` (se reutiliza)
- `CanvasBlock.tsx` (se reutiliza)

