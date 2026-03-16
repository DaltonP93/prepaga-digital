

# Revisión técnica: coordenadas, robustez y post-migración

## Problema crítico encontrado

**Coordenadas en `legacyToBlocks.ts` están en rango 0..100** (ej: `x: 5, y: 80, w: 40, h: 8`) pero `CanvasFieldOverlay` espera **rango 0..1** (multiplica por 100 para CSS: `left: ${pos.x * 100}%`). Los fields migrados se renderizan a `500%` left — completamente fuera de pantalla.

## Cambios

### 1. `legacyToBlocks.ts` — Coordenadas 0..1

Dividir todos los valores de `makeField` por 100. Ejemplo: `(5, 80, 40, 8)` → `(0.05, 0.80, 0.40, 0.08)`. Actualizar también `meta.normalized` que usa los mismos valores.

### 2. `OpenSignTemplateEditor.tsx` — Migración parcial + post-migración UX

- Cambiar detección: `needsMigration` → `canMigrateBlocks` (tiene legacy + no tiene blocks) y `canMigrateFields` (tiene legacy con firmas + no tiene fields)
- Banner se muestra si cualquiera de los dos es true
- `handleMigrate` solo inserta lo que falta (blocks si no hay, fields si no hay)
- Post-migración: `setCurrentPage(1)`, limpiar selecciones, seleccionar primer field o block tras invalidar queries

### 3. No se toca

- `CanvasFieldOverlay.tsx` (ya usa 0..1 correctamente)
- Backend / edge functions
- Legacy 1.0
- Otros componentes del editor

## Archivos

| Archivo | Cambio |
|---------|--------|
| `src/lib/legacyToBlocks.ts` | Coordenadas 0..1 + meta.normalized consistente |
| `src/components/designer2/opensign/OpenSignTemplateEditor.tsx` | Migración parcial + post-migración UX |

