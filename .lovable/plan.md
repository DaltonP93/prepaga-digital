

## Diagnóstico del problema

**Causa raíz identificada**: El `SelectTrigger` de Radix UI renderiza un elemento `<button>` HTML. Dentro del `<form>` del `TemplateForm`, los botones sin atributo `type="button"` actúan como `type="submit"` por defecto. Al hacer clic en el selector de "Tipo de Firma" o "Rol del Firmante", se **envía el formulario completo**, lo que guarda el template y provoca que el editor se re-renderice, cerrando la configuración del campo de firma.

Esto también aplica a los botones de alineación (float), el botón de Settings, y el botón "Guardar Configuración" dentro del componente de firma.

---

## Plan de cambios

### 1. Agregar `type="button"` a todos los botones en `SignatureFieldExtension.tsx`

Los siguientes elementos necesitan `type="button"` explícito:

- **Botones de float/alineación** (líneas 367, 376, 386) — ya usan `<Button>` pero sin `type`
- **Botón Settings** (línea 394) — abre/cierra configuración
- **Botón "Limpiar"** del MiniSignatureCanvas (línea 189)
- **Botón "Guardar Configuración"** (línea 466)
- **SelectTrigger** de "Tipo de Firma" (línea 415) y "Rol del Firmante" (línea 432) — necesitan `type="button"`

### 2. Agregar botón "Eliminar campo de firma"

- Destructurar `deleteNode` de las props del componente (ya disponible via `ReactNodeViewRenderer`)
- Agregar un botón con ícono de papelera (Trash2) en la barra de herramientas del campo, junto al botón de Settings
- Eliminación directa sin confirmación (es más rápido para el flujo de diseño)

### 3. Agregar `type="button"` en `EditorToolbar.tsx`

- El componente `ToolbarButton` interno (línea 66) renderiza `<Button>` sin `type`. Agregar `type="button"` para prevenir envíos accidentales del formulario padre.

---

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/components/editor/SignatureFieldExtension.tsx` | `type="button"` en todos los botones + destructurar `deleteNode` + botón eliminar |
| `src/components/EditorToolbar.tsx` | `type="button"` en ToolbarButton |

