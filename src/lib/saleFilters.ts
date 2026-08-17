/**
 * Filtros compartidos sobre la tabla `sales`.
 */

/**
 * sale_type de las VENTAS-OPERACIÓN creadas por una Incorporación de Adherente
 * ("Anexo de Incorporación"). No son ventas comerciales nuevas: son la
 * operación que permite firmar el anexo y liquidar su comisión por separado.
 */
export const SALE_TYPE_INCORPORACION = 'alta_adherente';

/**
 * Excluye las ventas-operación de listados, dashboards, reportes y métricas.
 *
 * Sin esto, cada incorporación de adherente contaría como una "venta" más e
 * inflaría los totales del mes, que es un dato que el negocio mira.
 *
 * En COMISIONES no se aplica: ahí las ventas-operación SÍ deben entrar, que es
 * justamente el motivo por el que existen.
 *
 * Se usa `.or(...)` en vez de `.neq(...)` porque en SQL `NULL <> 'x'` no es
 * verdadero: un `.neq()` pelado dejaría afuera también las ventas que tengan
 * `sale_type` sin cargar.
 */
export const excludeIncorporationSales = (query: any) =>
  query.or(`sale_type.is.null,sale_type.neq.${SALE_TYPE_INCORPORACION}`);

/** Template de campos personalizados del adicional Plan Materno. */
export const PLAN_MATERNO_TEMPLATE = 'Plan Materno';

/**
 * Qué template de "Campos del Plan" corresponde a una venta.
 *
 * El Plan Materno NO es un plan por sí mismo: va siempre ligado a otro plan y
 * se marca con el adicional `maternity_bonus` al inicio de la venta. Por eso el
 * adicional tiene PRIORIDAD sobre el plan elegido: sus campos se habilitan sea
 * cual sea el plan contratado.
 *
 * Sin adicional se cae al comportamiento anterior: buscar un template homónimo
 * del plan.
 */
export const resolvePlanFieldsTemplateName = (
  sale: { maternity_bonus?: boolean | null } | null | undefined,
  planName?: string | null,
): string | null => {
  if (sale?.maternity_bonus) return PLAN_MATERNO_TEMPLATE;
  return planName?.trim() || null;
};
