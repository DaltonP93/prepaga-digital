

# Migración Legacy → V2 completa en OpenSignTemplateEditor

## Resumen

Agregar soporte de `legacyContent` al editor V2 con banner de migración, ejecución de `parseLegacyHtml`, y persistencia de blocks + fields en una sola operación idempotente.

## Cambios

### 1. `OpenSignTemplateEditor.tsx` — Recibir `legacyContent` + banner + migración

- Agregar prop `legacyContent?: string`
- Detectar necesidad de migración: `legacyContent` presente AND `blocks.length === 0` AND `fields.length === 0` (después de que las queries carguen)
- Mostrar banner con AlertTriangle + texto + botón "Migrar a V2"
- Estado `migrating: boolean` para loading
- Al click:
  1. `parseLegacyHtml(templateId, legacyContent)` → `{ blocks, signatureFields }`
  2. Insertar blocks en `template_blocks` vía supabase batch insert (con `sort_order` asignado por índice)
  3. Insertar signatureFields en `template_fields` vía supabase batch insert
  4. Invalidar queries `['template-blocks', templateId]` y `['template-fields', templateId]`
  5. Toast de éxito
- Usar `supabase.from('template_blocks').insert(...)` y `supabase.from('template_fields').insert(...)` directo para batch (los hooks mutation son single-record)

### 2. `TemplateForm.tsx` — Pasar `legacyContent`

- En la línea donde renderiza `<OpenSignTemplateEditor templateId={template.id} />`, agregar `legacyContent={template?.content || watch("content")}`

## Archivos

| Archivo | Cambio |
|---------|--------|
| `src/components/designer2/opensign/OpenSignTemplateEditor.tsx` | Props + banner + migración |
| `src/components/TemplateForm.tsx` | Pasar `legacyContent` |

## No se toca
- `legacyToBlocks.ts` (ya devuelve blocks + signatureFields correctamente)
- Hooks de fields/blocks (se usa supabase directo para batch)
- Backend / edge functions
- Legacy 1.0

