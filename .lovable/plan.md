

# Migrar UI de Roles y Fields tipo OpenSign al Right Panel

## Resumen

Reescribir `OpenSignRightPanel.tsx` y `FieldOverlay.tsx` adoptando los patrones de OpenSign (RecipientList + WidgetComponent) pero adaptados a los roles del sistema (`titular`, `adherente`, `contratada`) y persistiendo en `template_fields`.

## Cambios

### 1. `OpenSignRightPanel.tsx` — Reescribir tabs Firmantes y Campos

**Tab Firmantes** — Inspirado en RecipientList.jsx:
- Cada rol se muestra como una card con avatar circular (inicial del rol) y color de fondo al seleccionar (azul/verde/púrpura)
- Indicador de check si el rol ya tiene campos asignados (como `isWidgetExist` en OpenSign)
- Contador de campos por rol
- El rol seleccionado se resalta con su color de fondo completo (no solo borde)
- Hover state con color atenuado del rol

**Tab Campos** — Inspirado en WidgetComponent + WidgetList:
- Grid de 2 columnas con todos los field types como botones (estilo OpenSign `getWidgetType`)
- Cada botón muestra icono + nombre del tipo
- Click en un campo = inserción directa en el canvas para el rol activo (sin dropdown separado de rol)
- Badge superior mostrando el rol activo con su color
- Indicador visual del modo placement activo

### 2. `FieldOverlay.tsx` — Reescribir como grid de widgets

Reemplazar los dropdowns de tipo/rol por un grid visual tipo OpenSign:
- Grid `grid-cols-2` de botones de campo (signature, initials, name, dni, date, text, checkbox, email)
- Cada botón con icono a la derecha y nombre a la izquierda (patrón `getWidgetType`)
- Click inserta el campo directamente con el `activeSignerRole` del contexto padre
- Mantener la lista de campos existentes agrupados por rol debajo
- Eliminar los `Select` dropdowns de tipo — el grid los reemplaza

### 3. Flujo de interacción

1. Usuario selecciona rol en tab Firmantes → se marca como activo
2. Cambia a tab Campos → ve grid de widgets con badge del rol activo
3. Click en widget → se crea `template_field` con ese `field_type` y `signer_role`
4. Campo aparece en canvas como overlay
5. Lista actualizada en ambas tabs

## Archivos

| Archivo | Cambio |
|---------|--------|
| `src/components/designer2/opensign/OpenSignRightPanel.tsx` | Reescribir tabs Firmantes y Campos con estilos OpenSign |
| `src/components/designer2/FieldOverlay.tsx` | Reescribir como grid de widgets clickeables |

## Lo que NO se toca
- Backend / `template_fields` schema
- `useTemplateFields` hooks
- `CanvasFieldOverlay.tsx`
- `OpenSignCanvas.tsx`

