-- Semilla mínima para poder USAR el módulo de comisiones en US test.
--
-- NO es una migración: son datos, no esquema. Por eso vive en seeds/ y no en
-- migrations/ — si estuviera en migrations/ se aplicaría sola en producción.
--
-- Motivo: commission_calculate_sale exige dos configuraciones que hoy NO tienen
-- pantalla en la app (sólo se leen, nunca se escriben):
--   - commission_promoter_types  -> sin fila: error 'salesperson_not_configured'
--   - commission_plan_settings   -> sin fila: error 'plan_not_configured'
-- Mientras no exista esa UI, se cargan por SQL.
--
-- Es idempotente: se puede correr varias veces sin duplicar nada.
-- El company_id se deriva de los planes existentes, para no depender de un UUID
-- hardcodeado que podría no coincidir en test.

-- 1) Tipo de promotor. El código '86' replica el "Tip Prom 86" del reporte
--    legado. Agregá más filas si manejás varias categorías de promotor.
INSERT INTO public.commission_promoter_types (company_id, code, name, default_percent, is_active)
SELECT DISTINCT p.company_id, '86', 'Promotor', NULL::numeric, true
FROM public.plans p
WHERE p.is_active
ON CONFLICT (company_id, code) DO NOTHING;

-- 2) Mapeo plan -> INDIVIDUAL / GRUPAL, para todos los planes activos.
--    Se siembra todo como INDIVIDUAL: los planes actuales (Alfa, Beta, Kids,
--    Senior, Seven, Alfa Ambulatorio) son productos individuales. Si alguno es
--    grupal (empresarial/corporativo), cambialo con el UPDATE de más abajo.
INSERT INTO public.commission_plan_settings (company_id, plan_id, group_type, is_active)
SELECT p.company_id, p.id, 'INDIVIDUAL', true
FROM public.plans p
WHERE p.is_active
ON CONFLICT (company_id, plan_id) DO NOTHING;

-- Para marcar un plan como GRUPAL (ejemplo, ajustar el nombre):
-- UPDATE public.commission_plan_settings ps
--    SET group_type = 'GRUPAL', updated_at = now()
--   FROM public.plans p
--  WHERE p.id = ps.plan_id AND p.name ILIKE '%empresarial%';

-- 3) Verificación: qué quedó configurado y qué falta.
SELECT 'tipos de promotor' AS item, count(*)::text AS valor FROM public.commission_promoter_types
UNION ALL
SELECT 'planes mapeados', count(*)::text FROM public.commission_plan_settings
UNION ALL
SELECT 'planes activos sin mapear', count(*)::text
  FROM public.plans p
 WHERE p.is_active
   AND NOT EXISTS (SELECT 1 FROM public.commission_plan_settings ps WHERE ps.plan_id = p.id)
UNION ALL
SELECT 'vendedores habilitados', count(*)::text FROM public.commission_salespeople WHERE is_active
UNION ALL
SELECT 'reglas activas', count(*)::text FROM public.commission_rules WHERE is_active
UNION ALL
SELECT 'modulo habilitado (is_enabled)', coalesce(bool_or(is_enabled)::text, 'sin fila')
  FROM public.commission_settings;
