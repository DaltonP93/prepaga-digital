

# Plan completo: Designer v2.0 Premium + Fix de imágenes en Legacy y V2

Basado en la auditoría completa del código actual y los requisitos del archivo PROMPT_DESIGNER_V2_PREMIUM.md, este plan se divide en 4 fases priorizadas.

---

## Estado actual detectado

**Ya implementado:**
- Layout 3 columnas (PagesSidebar, Canvas, RightPanel)
- 11 tipos de widgets con drag-and-drop via @dnd-kit
- Overlay de campos (CanvasFieldOverlay, FieldOverlay)
- Bloques de contenido (text, heading, image, signature_block, table, etc.)
- Upload de PDF con thumbnails client-side (AssetUploadModal)
- Migración legacy a V2 (parseLegacyHtml)
- Upload centralizado de imágenes (uploadTemplateImage)
- Zoom, fit-width, fit-page, pinch-to-zoom
- Roles fijos (titular, adherente, contratada)
- VersionPanel para historial
- Dialog estable con onPointerDownOutside/onInteractOutside/onFocusOutside
- Input file estable en raíz del editor V2 (imageFileInputRef)

**No implementado o roto:**
1. Legacy V1: las imágenes insertadas no se pueden mover, redimensionar ni posicionar lado a lado
2. V2: no hay botón dedicado de "Insertar Imagen" en el panel derecho (solo "Insertar Documento")
3. V2: texto del botón dice "PDF/DOCX" cuando DOCX no está soportado en backend
4. Legacy V1: no hay resize handles en imágenes del TipTap
5. V2: al agregar bloque "image", no hay forma directa de subir imagen sin ir al panel Props
6. Varios items del .md aún no existen (ver detalle por fase)

---

## FASE 1 — Fix crítico: Imágenes editables (Legacy + V2)

### 1A. Legacy V1: Imágenes con resize y reposicionamiento

**Problema:** TipTap usa la extensión Image nativa que renderiza `<img>` sin handles. No se puede mover ni redimensionar.

**Solución:** Crear una extensión `ResizableImage` con un `ReactNodeViewRenderer` que:
- Muestre handles de resize en las 4 esquinas al seleccionar
- Permita arrastrar la imagen dentro del editor
- Permita cambiar float (left/right/none) y tamaño (width)
- Persista width/height/float como atributos del nodo

**Archivos a crear/modificar:**
- Crear: `src/components/editor/ResizableImageExtension.tsx` — NodeView con handles de resize, toolbar flotante (alinear izq/centro/der, redimensionar)
- Modificar: `src/components/TipTapEditor.tsx` — reemplazar `Image.extend(...)` por la nueva extensión
- Modificar: `src/index.css` — agregar estilos para handles y selección de imagen

**Detalles del NodeView:**
```text
┌──────────────────────┐
│  [Izq] [Centro] [Der]│  ← toolbar flotante al seleccionar
│  ┌────────────────┐  │
│  │                │  │
│  │    IMAGEN      ●──│── handle resize
│  │                │  │
│  └────────────────┘  │
│  Ancho: [____] px    │
└──────────────────────┘
```

Atributos del nodo: `src`, `alt`, `width`, `height`, `float` (none/left/right), `display` (inline/block)

### 1B. V2: Botón dedicado de imagen en panel derecho

**Problema:** El panel derecho solo tiene "Insertar Documento (PDF/DOCX)". No hay forma directa de insertar una imagen como bloque.

**Solución:**
- Agregar botón "Insertar Imagen" en OpenSignRightPanel debajo del botón de documento
- Al hacer click: crear un bloque tipo `image` y abrir el file picker estable
- Cambiar texto "Insertar Documento (PDF/DOCX)" a "Insertar Documento (PDF)" ya que DOCX no está soportado

**Archivos a modificar:**
- `src/components/designer2/opensign/OpenSignRightPanel.tsx` — agregar botón imagen + cambiar texto
- `src/components/designer2/opensign/OpenSignTemplateEditor.tsx` — agregar handler `handleInsertImageBlock` que crea bloque image + abre picker

### 1C. V2: Bloque imagen con resize visual

**Problema:** Los bloques image en V2 solo se ven como thumbnail estático. No hay resize ni reposicionamiento granular.

**Solución:** Ya existe el sistema de resize en `CanvasBlock.tsx` para bloques posicionados (POSITIONED_TYPES incluye "image"). Lo que falta es que al crear un bloque image se posicione correctamente y que el resize persista.

**Verificar/ajustar:**
- `CanvasBlock.tsx` — confirmar que image blocks usan resize handles
- `OpenSignTemplateEditor.tsx` — al crear bloque image, asignar coordenadas razonables (x:10, y:10, w:30, h:20)

---

## FASE 2 — Completar paridad OpenSign del .md

### 2A. Upload de PDF desde canvas vacío

**Ya existe** vía AssetUploadModal. Pero el .md pide que si no hay PDF cargado, el canvas central muestre una zona de upload directa.

**Archivos a modificar:**
- `src/components/designer2/opensign/OpenSignCanvas.tsx` — si `totalPages === 0` y no hay bloques, mostrar dropzone inline en el canvas con texto "Arrastrá un PDF aquí o hacé click para seleccionar"

### 2B. Toolbar superior mejorada

**Ya existe parcialmente** (zoom, paginación). Faltan según .md:
- Nombre del template editable inline (actualmente no se muestra)
- Botón "Guardar" directo (actualmente requiere volver a la pestaña y presionar Guardar del form)
- Botón "Vista previa" directo

**Archivos a modificar:**
- `src/components/designer2/opensign/OpenSignCanvas.tsx` — agregar nombre editable y botones Guardar/Preview en toolbar
- Pasar callbacks `onSave` y `onPreview` desde OpenSignTemplateEditor

### 2C. Validaciones antes de guardar

El .md pide:
- Cada rol que participe debe tener al menos 1 campo signature
- Si no tiene → warning visual
- El PDF base debe estar en estado "ready"

**Archivos a modificar:**
- `src/components/designer2/opensign/OpenSignRightPanel.tsx` — mostrar badge warning en roles sin firma
- `src/components/designer2/opensign/OpenSignTemplateEditor.tsx` — validar al guardar

### 2D. Propiedades avanzadas inline por widget

**Ya existe parcialmente** en FieldPropertyPanel (label, required, signer_role, posición). Faltan:
- Placeholder text editable
- Estilo de borde (solid/dashed/dotted)
- Color personalizado por campo
- Opciones específicas por tipo (dropdown: opciones, radio: opciones)

**Archivos a modificar:**
- `src/components/designer2/opensign/OpenSignRightPanel.tsx` — extender FieldPropertyPanel con campos extra según field_type

---

## FASE 3 — Mejoras de persistencia y reapertura

### 3A. Signed URLs al reabrir

**Problema:** Las imágenes insertadas usan signed URLs que expiran en 1 hora. Al reabrir el editor, las imágenes quedan rotas.

**Solución:**
- Guardar `storage_path` en `content.storage_path` del bloque (ya se hace)
- Al cargar bloques imagen, regenerar signed URL si `content.src` no es accesible
- Crear hook `useResolvedBlockImages` que resuelve signed URLs para bloques image al montar

**Archivos a crear/modificar:**
- Crear: `src/hooks/useResolvedBlockImages.ts`
- Modificar: `src/components/designer2/CanvasBlock.tsx` — usar el hook para resolver URLs

### 3B. Persistencia end-to-end V2

**Verificar y corregir** estos flujos:
1. Template nuevo V2 → guardar → reabrir → diseñador funciona
2. Template V1 → cambiar a V2 → guardar → diseñador funciona
3. V2 sin assets → solo bloques de texto → funciona
4. V2 con PDF → insertar documento → persistir → reabrir → páginas visibles
5. Insertar imagen → guardar → reabrir → imagen visible

---

## FASE 4 — Features avanzados del .md

### 4A. Roles dinámicos (AddRoleModal)

El .md define 3 roles fijos (titular, adherente, contratada). Esto ya está implementado. El .md explícitamente dice "No se pueden agregar más". Solo falta visualmente poder deseleccionar roles que no participan.

### 4B. Render PDF runtime con react-pdf

El .md menciona como alternativa usar pdfjs-dist en el cliente en vez de pre-renderizar thumbnails. Actualmente ya se usa pdfjs-dist para thumbnails en AssetUploadModal. El canvas central usa las imágenes pre-renderizadas. Este approach es correcto y más performante.

### 4C. Prefill / compose / flujo final de envío

El .md sección 12 describe cómo se usa el template en firma. Esto ya existe parcialmente en `compose-template-pdf` edge function y el flujo de firma. No forma parte del editor sino del flujo de ventas.

### 4D. Recipients/signers dinámicos

Ligado a los roles. El sistema actual usa roles fijos vinculados a la venta (titular, adherentes, contratada). No requiere cambios en el editor.

---

## Resumen de archivos por fase

### Fase 1 (prioritaria)
| Archivo | Acción |
|---------|--------|
| `src/components/editor/ResizableImageExtension.tsx` | Crear |
| `src/components/TipTapEditor.tsx` | Modificar (usar nueva extensión) |
| `src/index.css` | Agregar estilos resize handles |
| `src/components/designer2/opensign/OpenSignRightPanel.tsx` | Agregar botón imagen + fix texto |
| `src/components/designer2/opensign/OpenSignTemplateEditor.tsx` | Handler insert image block |

### Fase 2
| Archivo | Acción |
|---------|--------|
| `src/components/designer2/opensign/OpenSignCanvas.tsx` | Dropzone vacío + toolbar mejorada |
| `src/components/designer2/opensign/OpenSignRightPanel.tsx` | Warnings roles + props avanzadas |
| `src/components/designer2/opensign/OpenSignTemplateEditor.tsx` | Validaciones + callbacks save/preview |

### Fase 3
| Archivo | Acción |
|---------|--------|
| `src/hooks/useResolvedBlockImages.ts` | Crear |
| `src/components/designer2/CanvasBlock.tsx` | Resolver signed URLs |

### Fase 4
Principalmente verificaciones y ajustes menores, sin componentes nuevos significativos.

---

## Orden de implementación recomendado

1. **Fase 1A** — ResizableImageExtension para Legacy (fix más visible para el usuario)
2. **Fase 1B** — Botón imagen en V2 + fix texto
3. **Fase 1C** — Verificar resize en V2
4. **Fase 3A** — Signed URLs al reabrir (persistencia)
5. **Fase 2A-2D** — Paridad OpenSign completa
6. **Fase 3B** — QA de persistencia
7. **Fase 4** — Features avanzados

