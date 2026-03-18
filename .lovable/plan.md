

# Plan: Fix de imágenes rotas en templates (cabecera/zócalo)

## Problema raíz

Las imágenes insertadas en el editor TipTap (Legacy 1.0) se guardan en el HTML con `<img src="signed-url">` donde la URL firmada expira en 1 hora. Al volver a abrir el template, las imágenes aparecen rotas porque la URL ya no es válida. El `file_uploads` table tiene el `file_url` (storage path), pero el HTML del template solo guarda la URL firmada temporal.

## Solución: almacenar `storage_path` y resolver al renderizar

### A. Agregar atributo `storage_path` a `ResizableImageExtension`

**Archivo:** `src/components/editor/ResizableImageExtension.tsx`

- Agregar atributo `"data-storage-path"` al schema de la extensión (`addAttributes` + `renderHTML` + `parseHTML`)
- Cuando el HTML se serializa, incluye `data-storage-path="companyId/template-images/..."` como atributo del `<img>`

### B. Pasar storage path al insertar imagen

**Archivo:** `src/components/ImageManager.tsx`

- Cambiar `onImageSelect` callback para pasar tanto la URL firmada como el storage path: `onImageSelect(signedUrl, storagePath)`
- El `handleImageClick` ya tiene acceso a `img.file_url` (storage path) y `getImageUrl(img)` (signed URL)

**Archivo:** `src/components/TipTapEditor.tsx`

- Actualizar `addImage` para aceptar un `storagePath` opcional
- Al insertar imagen, setear `{ src: signedUrl, "data-storage-path": storagePath }`

### C. Resolver storage paths al cargar contenido en el editor

**Archivo:** `src/components/TipTapEditor.tsx`

- Crear función `resolveContentImages(html)` que:
  1. Parsea el HTML con regex buscando `<img[^>]*data-storage-path="([^"]+)"[^>]*>`
  2. Para cada match, genera nueva signed URL via `supabase.storage.from("documents").createSignedUrl(path, 3600)`
  3. Reemplaza el `src` con la URL fresca
- Ejecutar esta función en el `useEffect` que setea el contenido inicial del editor

### D. Resolver storage paths en LiveTemplatePreview

**Archivo:** `src/components/templates/LiveTemplatePreview.tsx`

- Antes de renderizar con `dangerouslySetInnerHTML`, ejecutar la misma resolución de storage paths
- Usar `useEffect` + `useState` para resolver URLs asíncronamente
- Reemplazar `src` expirados con URLs frescas en el HTML procesado

### E. Migrar imágenes existentes (fix para templates ya guardados)

**Archivo:** `src/components/TipTapEditor.tsx`

- En la función de resolución, si un `<img>` tiene `src` que es una URL de Supabase Storage (contiene `/storage/v1/`) pero NO tiene `data-storage-path`, intentar extraer el path de la URL y agregar el atributo automáticamente
- Esto permite que templates existentes con URLs expiradas se auto-reparen al abrirlos en el editor

### F. Proteger imágenes en DOMPurify

**Archivo:** `src/components/templates/LiveTemplatePreview.tsx`

- Configurar DOMPurify para permitir el atributo `data-storage-path` en `<img>` tags:
  `DOMPurify.sanitize(html, { ADD_ATTR: ['data-storage-path'] })`

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/editor/ResizableImageExtension.tsx` | Agregar atributo `data-storage-path` |
| `src/components/ImageManager.tsx` | Pasar storage path en callback |
| `src/components/TipTapEditor.tsx` | Resolver URLs al cargar, insertar con storage path |
| `src/components/templates/LiveTemplatePreview.tsx` | Resolver URLs antes de renderizar |

## Orden de implementación

1. ResizableImageExtension — agregar atributo
2. ImageManager — pasar storage path
3. TipTapEditor — resolver al cargar + insertar con path
4. LiveTemplatePreview — resolver antes de render

