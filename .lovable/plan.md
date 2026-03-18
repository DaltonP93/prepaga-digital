

# Plan: Fix monto en documento — usar sale.total_amount en vez de plan.price

## Problema identificado

En `src/lib/enhancedTemplateEngine.ts`, las líneas 625-628 definen aliases globales que usan **el precio del plan** en vez del **total de la venta**:

```ts
// Líneas 625-628 — ACTUAL (incorrecto)
'{{amount}}': context.plan.precioFormateado,
'{{monto}}': context.plan.precioFormateado,
'{{precio}}': context.plan.precioFormateado,
```

Estos placeholders se usan fuera del loop de beneficiarios para mostrar el monto total. Deberían apuntar a `context.venta.totalFormateado` (que ya se calcula correctamente como la suma de beneficiarios en línea 297-299).

Nota: `context.venta.total` y `context.venta.totalFormateado` ya usan `effectiveTotal` (suma de beneficiarios), así que `{{venta.total}}`, `{{venta.totalFormateado}}`, `{{monto_total}}` y `{{monto_total_letras}}` ya están correctos. Solo los 3 aliases globales apuntan al lugar equivocado.

En el edge function `generate-pdf/index.ts`, el campo `precioFormateado` (línea ~107) también usa `plan.price` — debe usar `sale.total_amount`.

## Cambios

### 1. `src/lib/enhancedTemplateEngine.ts` — líneas 625-628

Cambiar los 3 aliases globales para usar el total de la venta:

```ts
// DESPUÉS (correcto)
'{{amount}}': context.venta.totalFormateado,
'{{monto}}': context.venta.totalFormateado,
'{{precio}}': context.venta.totalFormateado,
```

### 2. `supabase/functions/generate-pdf/index.ts` — línea ~107

Cambiar `precioFormateado` en el objeto de interpolación del plan:

```ts
// ANTES
precioFormateado: `$${(sale.plans?.price || 0).toLocaleString()}`,

// DESPUÉS
precioFormateado: `$${(sale.total_amount || sale.plans?.price || 0).toLocaleString()}`,
```

Y también el `totalFormateado` de venta ya usa `sale.total_amount`, así que está bien.

## Sin cambios
- `templateEngine.ts`: `plan.precio` mantiene `plan.price` porque ese campo representa el precio base del plan (correcto semánticamente). Los templates que necesitan el total de la venta usan `{{venta.total}}`.
- Los montos dentro del loop de beneficiarios (`{{monto}}`, `{{montoFormateado}}`) se resuelven PER-BENEFICIARY en el Step 0, antes de que lleguen a los aliases globales del Step 2, así que no se ven afectados.
- No hay cambios visuales ni de UX.

