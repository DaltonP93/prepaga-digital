

# Auditoría técnica: OpenSign → SAMAP Designer 2.0

## Checklist archivo por archivo

```text
┌─────────────────────────────────────┬────────────────────────────────────────────┬───────────┬─────────────────────────────────────────────────────┐
│ OpenSign original                   │ Equivalente en SAMAP                       │ Estado    │ Qué falta para paridad con OpenSign                 │
├─────────────────────────────────────┼────────────────────────────────────────────┼───────────┼─────────────────────────────────────────────────────┤
│ TemplatePlaceholder.jsx             │ OpenSignTemplateEditor.tsx                 │ PARCIAL   │ No tiene: fetchTemplate via API, creación de        │
│ (2339 líneas — page principal)      │ (357 líneas)                               │           │ documento desde template, envío por mail,            │
│                                     │                                            │           │ customización de correo, gestión de signatarios      │
│                                     │                                            │           │ dinámicos, tour/onboarding, manejo de PDF            │
│                                     │                                            │           │ ArrayBuffer, rotación de páginas, merge PDF,         │
│                                     │                                            │           │ prefill de widgets, bulk send.                       │
│                                     │                                            │           │ Sí tiene: layout 3 columnas, zoom, migración         │
│                                     │                                            │           │ legacy, selección coordinada block/field.             │
├─────────────────────────────────────┼────────────────────────────────────────────┼───────────┼─────────────────────────────────────────────────────┤
│ RenderAllPdfPage.jsx                │ OpenSignPagesSidebar.tsx                   │ PARCIAL   │ No tiene: react-pdf <Document>/<Page> rendering,    │
│ (232 líneas — sidebar de páginas)   │ (75 líneas)                                │           │ bookmark de firma por página, merge PDF desde        │
│                                     │                                            │           │ sidebar. Usa imágenes estáticas (previews de         │
│                                     │                                            │           │ template_asset_pages) en vez de render PDF real.      │
│                                     │                                            │           │ Funcional para el modelo SAMAP (asset-based).        │
├─────────────────────────────────────┼────────────────────────────────────────────┼───────────┼─────────────────────────────────────────────────────┤
│ RenderPdf.jsx                       │ OpenSignCanvas.tsx                         │ PARCIAL   │ No tiene: react-pdf <Document>/<Page> rendering,    │
│ (570 líneas — canvas central)       │ (223 líneas)                               │           │ posWidth/posHeight scaling con containerScale,       │
│                                     │                                            │           │ pinch-to-zoom, react-dnd drop zone, smooth scroll   │
│                                     │                                            │           │ to widget, per-widget scale tracking. Usa sistema    │
│                                     │                                            │           │ CSS transform(scale) simple. No react-dnd.           │
├─────────────────────────────────────┼────────────────────────────────────────────┼───────────┼─────────────────────────────────────────────────────┤
│ PdfHeader.jsx                       │ Toolbar inline en OpenSignCanvas.tsx       │ PARCIAL   │ No tiene: prev/next page buttons, download PDF,     │
│ (749 líneas — barra superior)       │ (30 líneas de toolbar)                     │           │ print, delete page, reorder pages modal, merge       │
│                                     │                                            │           │ PDF, flatten PDF, decline. Solo tiene zoom           │
│                                     │                                            │           │ controls + fit width/page + page indicator.           │
├─────────────────────────────────────┼────────────────────────────────────────────┼───────────┼─────────────────────────────────────────────────────┤
│ RecipientList.jsx                   │ OpenSignRightPanel.tsx (tab "Firmantes")   │ PARCIAL   │ No tiene: drag-to-reorder signers, add/remove/edit  │
│ (272 líneas — lista de firmantes)   │ (~40 líneas en tab roles)                  │           │ signers dinámicamente, color assignment por signer,  │
│                                     │                                            │           │ prefill toggle, link user modal. Tiene 3 roles       │
│                                     │                                            │           │ fijos (titular/adherente/contratada) sin CRUD.       │
├─────────────────────────────────────┼────────────────────────────────────────────┼───────────┼─────────────────────────────────────────────────────┤
│ WidgetComponent.jsx                 │ OpenSignRightPanel.tsx (tab "Campos")      │ PARCIAL   │ No tiene: react-dnd drag refs por widget, modal      │
│ (287 líneas — panel de widgets)     │ + FieldOverlay.tsx                         │           │ de signers, draw widget. Usa click-to-place en vez  │
│                                     │ (~90 líneas en tab + 184 overlay)          │           │ de drag-and-drop. 8 field types vs 17 de OpenSign.   │
├─────────────────────────────────────┼────────────────────────────────────────────┼───────────┼─────────────────────────────────────────────────────┤
│ WidgetList.jsx                      │ FieldOverlay.tsx (grid de widgets)         │ PARCIAL   │ No tiene: drag ref per widget, touch support.        │
│ (33 líneas — render lista)          │ (líneas 108-130)                           │           │ Funcional con click-to-insert.                       │
├─────────────────────────────────────┼────────────────────────────────────────────┼───────────┼─────────────────────────────────────────────────────┤
│ getWidgetType.jsx                   │ No existe (inline en FieldOverlay)         │ PARCIAL   │ No hay componente separado. El styling del botón     │
│ (28 líneas — UI de widget button)   │                                            │           │ de widget está inline en FieldOverlay. Funcional.    │
├─────────────────────────────────────┼────────────────────────────────────────────┼───────────┼─────────────────────────────────────────────────────┤
│ Placeholder.jsx                     │ CanvasFieldOverlay.tsx                     │ PARCIAL   │ No tiene: react-rnd (Rnd), per-widget scaling,      │
│ (1233 líneas — widget overlay       │ (323 líneas)                               │           │ date picker, dropdown/radio/checkbox config          │
│ interactivo con Rnd)                │                                            │           │ modals, cell count settings, copy placeholder,       │
│                                     │                                            │           │ font size/color per widget, status                   │
│                                     │                                            │           │ required/optional toggle inline, prefill response.   │
│                                     │                                            │           │ Sí tiene: drag, 8-handle resize, selection,          │
│                                     │                                            │           │ keyboard shortcuts (Del/Esc), live position tooltip. │
├─────────────────────────────────────┼────────────────────────────────────────────┼───────────┼─────────────────────────────────────────────────────┤
│ BorderResize.jsx                    │ CanvasFieldOverlay.tsx (inline handles)    │ COMPLETO  │ Implementado con 8 handles (vs 1 corner en           │
│ (24 líneas — corner resize)         │ (líneas 290-305)                           │           │ OpenSign). Superado funcionalmente.                  │
├─────────────────────────────────────┼────────────────────────────────────────────┼───────────┼─────────────────────────────────────────────────────┤
│ DragElement.jsx                     │ No existe como archivo separado            │ NO IMPL.  │ OpenSign usa react-dnd DragElement para arrastrar    │
│                                     │                                            │           │ widgets desde sidebar al canvas. SAMAP usa           │
│                                     │                                            │           │ click-to-place en su lugar. Diferente paradigma.     │
├─────────────────────────────────────┼────────────────────────────────────────────┼───────────┼─────────────────────────────────────────────────────┤
│ WidgetsDragPreview.jsx              │ No existe                                  │ NO IMPL.  │ Custom drag layer (ghost preview durante drag).      │
│                                     │                                            │           │ No necesario si no hay drag-and-drop.                │
├─────────────────────────────────────┼────────────────────────────────────────────┼───────────┼─────────────────────────────────────────────────────┤
│ useWidgetDrag.js                    │ No existe                                  │ NO IMPL.  │ Hook react-dnd para drag refs. No necesario con      │
│                                     │                                            │           │ paradigma click-to-place actual.                     │
├─────────────────────────────────────┼────────────────────────────────────────────┼───────────┼─────────────────────────────────────────────────────┤
│ usePdfPinchZoom.js                  │ No existe                                  │ NO IMPL.  │ Pinch-to-zoom en mobile/trackpad. Canvas actual      │
│                                     │                                            │           │ solo tiene botones +/- de zoom.                      │
├─────────────────────────────────────┼────────────────────────────────────────────┼───────────┼─────────────────────────────────────────────────────┤
│ widgetUtils.js                      │ No existe como archivo separado            │ PARCIAL   │ Utilidades dispersas en CanvasFieldOverlay.tsx        │
│                                     │                                            │           │ (clamp, applyResize, defaults). No centralizado.     │
├─────────────────────────────────────┼────────────────────────────────────────────┼───────────┼─────────────────────────────────────────────────────┤
│ AddRoleModal.jsx                    │ No existe                                  │ NO IMPL.  │ Modal para agregar roles dinámicos. SAMAP tiene      │
│                                     │                                            │           │ 3 roles fijos hardcodeados en OpenSignRightPanel.    │
├─────────────────────────────────────┼────────────────────────────────────────────┼───────────┼─────────────────────────────────────────────────────┤
│ EditorToolbar.jsx (OpenSign)        │ EditorToolbar.tsx (SAMAP — Legacy 1.0)     │ COMPLETO  │ Existe pero es del editor Legacy 1.0 (TipTap).      │
│                                     │                                            │           │ No aplica a Designer 2.0 que no usa TipTap.          │
├─────────────────────────────────────┼────────────────────────────────────────────┼───────────┼─────────────────────────────────────────────────────┤
│ PrevNext.jsx                        │ No existe                                  │ NO IMPL.  │ Botones prev/next page. SAMAP navega por click en    │
│                                     │                                            │           │ thumbnail de sidebar. Funcional pero diferente.       │
└─────────────────────────────────────┴────────────────────────────────────────────┴───────────┴─────────────────────────────────────────────────────┘
```

## Resumen cuantitativo

| Estado | Cantidad | Componentes |
|--------|----------|-------------|
| **Completo** | 2 | BorderResize, EditorToolbar |
| **Parcial** | 11 | TemplatePlaceholder, RenderAllPdfPage, RenderPdf, PdfHeader, RecipientList, WidgetComponent, WidgetList, getWidgetType, Placeholder, widgetUtils |
| **No implementado** | 5 | DragElement, WidgetsDragPreview, useWidgetDrag, usePdfPinchZoom, AddRoleModal, PrevNext |

## Gaps críticos para llegar a paridad OpenSign

1. **No hay react-pdf rendering**: SAMAP usa imágenes estáticas de `template_asset_pages` como fondo del canvas, no renderiza el PDF en tiempo real. Esto es una decisión arquitectónica deliberada (asset-based vs runtime rendering), no un bug.

2. **No hay drag-and-drop de widgets**: Se usa click-to-place en vez de react-dnd. Funciona pero es menos intuitivo que arrastrar un widget al canvas.

3. **Roles fijos**: 3 roles hardcodeados (titular/adherente/contratada) vs roles dinámicos con CRUD en OpenSign. No hay AddRoleModal.

4. **Widget types reducidos**: 8 tipos (signature, initials, name, dni, date, text, checkbox, email) vs 17 en OpenSign (faltan: stamp, job title, company, text input, cells, dropdown, radio, image, draw).

5. **No hay pinch-to-zoom**: Solo botones de zoom, no gesture support.

6. **No hay gestión de documento**: No crea documento desde template, no envía por mail, no tiene customización de correo, no tiene prefill, no tiene bulk send.

## Nota importante

Muchos de estos gaps son **decisiones de diseño**, no omisiones. SAMAP usa un modelo asset-based con Supabase como backend (no Parse), coordenadas normalizadas 0..1 (no pixels), y un paradigma click-to-place. La arquitectura es fundamentalmente diferente a OpenSign, por lo que una paridad 1:1 no es el objetivo. Lo que importa es que las funcionalidades core (posicionar campos de firma sobre PDF, asignar a roles, persistir, generar documento) estén cubiertas.

