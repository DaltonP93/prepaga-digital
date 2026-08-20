/**
 * Catálogo único de `sales.sale_type`.
 *
 * Hay dos familias, y la diferencia NO es cosmética:
 *
 *  · TIPOS MANUALES (`venta_nueva`, `reingreso`): los elige el vendedor en el
 *    formulario. Son ventas comerciales de verdad y cuentan en listados,
 *    dashboards y métricas del mes.
 *
 *  · TIPOS DE OPERACIÓN (`alta_adherente`, `cambio_plan`): los pone el SISTEMA
 *    al crear una venta-operación sobre un contrato ya firmado. No son ventas
 *    nuevas: existen para poder firmar el anexo/formulario y liquidar su
 *    comisión por separado. Nunca deben aparecer en el selector de "Tipo de
 *    Venta" ni inflar las métricas (ver `excludeOperationSales` en saleFilters).
 */

export const SALE_TYPES = {
  VENTA_NUEVA: 'venta_nueva',
  REINGRESO: 'reingreso',
  ALTA_ADHERENTE: 'alta_adherente',
  CAMBIO_PLAN: 'cambio_plan',
} as const;

export type SaleType = (typeof SALE_TYPES)[keyof typeof SALE_TYPES];

export interface SaleTypeOption {
  value: SaleType;
  label: string;
}

const LABELS: Record<SaleType, string> = {
  venta_nueva: 'Venta Nueva',
  reingreso: 'Reingreso',
  alta_adherente: 'Incorporación de Adherente',
  cambio_plan: 'Cambio de Plan',
};

/** Todos los tipos, para mostrar/filtrar en listados. */
export const SALE_TYPE_OPTIONS: SaleTypeOption[] = (
  Object.keys(LABELS) as SaleType[]
).map((value) => ({ value, label: LABELS[value] }));

/**
 * Los únicos que un vendedor puede elegir a mano en el formulario de venta.
 * Alimenta el <Select> de "Tipo de Venta" en SaleBasicTab.
 */
export const MANUAL_SALE_TYPE_OPTIONS: SaleTypeOption[] = [
  { value: SALE_TYPES.VENTA_NUEVA, label: LABELS.venta_nueva },
  { value: SALE_TYPES.REINGRESO, label: LABELS.reingreso },
];

/**
 * Tipos que crea el sistema como venta-operación. Se excluyen de métricas
 * (pero NO de comisiones: ahí sí tienen que entrar).
 */
export const OPERATION_SALE_TYPES: SaleType[] = [
  SALE_TYPES.ALTA_ADHERENTE,
  SALE_TYPES.CAMBIO_PLAN,
];

export const isOperationSaleType = (value?: string | null): boolean =>
  !!value && (OPERATION_SALE_TYPES as string[]).includes(value);

/**
 * Etiqueta legible de un tipo de venta.
 *
 * Nunca devuelve `undefined`: si el valor no está en el catálogo (dato viejo o
 * escrito a mano en la base) se muestra crudo, que es mejor que una celda vacía.
 */
export const saleTypeLabel = (value?: string | null): string => {
  if (!value) return '';
  return LABELS[value as SaleType] ?? value;
};
