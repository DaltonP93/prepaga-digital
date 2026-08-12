-- =====================================================================
-- Plan Materno — SQL a aplicar en PRODUCCIÓN
-- Proyecto: ejiycfqxgtrzaysgpzmx (Seguro Digital CyD)
-- Fecha:    2026-08-12
--
-- Acompaña a los commits 4a5479b / e8ad0c4 / 3b1800d.
-- Ejecutar en Supabase → SQL Editor ANTES (o junto con) el rebuild del
-- front, porque el BLOQUE 1 es lo que hace aparecer la pestaña.
--
-- SEGURIDAD:
--   · NO borra ni modifica ninguna fila existente.
--   · Es idempotente: se puede correr varias veces sin efecto duplicado.
--   · Verificado contra los datos reales de producción (ver notas).
-- =====================================================================


-- ---------------------------------------------------------------------
-- BLOQUE 1 (OBLIGATORIO) — Crear el plan "Plan Materno"
-- ---------------------------------------------------------------------
-- Por qué: la pestaña "Campos del Plan" ahora se muestra según el PLAN
-- seleccionado en la venta (antes era por template). En producción ya
-- existe el TEMPLATE "Plan Materno" con sus 5 preguntas, pero NO existe
-- el PLAN homónimo. Sin esta fila la pestaña no aparece nunca.
--
-- El nombre debe ser exactamente 'Plan Materno' para que matchee con el
-- template (el matcheo normaliza mayúsculas/acentos y admite substring).
--
-- Verificado: simulando el matcheo contra los 6 planes activos de
-- producción, ningún otro plan queda afectado — solo Plan Materno
-- muestra la pestaña. Cero regresión.
--
-- price = 0 a propósito: el importe real se carga por venta en el campo
-- manual "Monto de la Cuota". Se puede editar después desde el panel.

INSERT INTO public.plans (company_id, name, description, price, is_active, sort_order)
SELECT
  '0a1dc0e5-7378-4d14-b7bc-646b3e652bc6'::uuid,
  'Plan Materno',
  'Plan de cobertura materna. Requiere completar campos adicionales por venta.',
  0,
  true,
  0
WHERE NOT EXISTS (
  SELECT 1 FROM public.plans
  WHERE company_id = '0a1dc0e5-7378-4d14-b7bc-646b3e652bc6'::uuid
    AND lower(btrim(name)) = 'plan materno'
);


-- ---------------------------------------------------------------------
-- BLOQUE 2 (RECOMENDADO) — Arreglar el error 409 al re-guardar campos
-- ---------------------------------------------------------------------
-- Por qué: template_responses tiene RLS activo pero SOLO políticas de
-- INSERT y SELECT. El front guarda con "borrar y volver a insertar":
-- el DELETE afecta 0 filas EN SILENCIO (no hay política) y el INSERT
-- posterior choca contra UNIQUE(sale_id, template_id, question_id) → 409.
--
-- Efecto hoy: el vendedor puede cargar los campos UNA vez; si necesita
-- corregir un dato, el guardado falla. Ya reproducido en test y en prod.
--
-- Alcance de las políticas nuevas: EXACTAMENTE el mismo que las de
-- INSERT/SELECT que ya existen (ventas de la propia empresa del usuario).
-- No amplía el acceso a otras empresas ni al rol anónimo.

DROP POLICY IF EXISTS "Authenticated users can update template responses" ON public.template_responses;
CREATE POLICY "Authenticated users can update template responses"
ON public.template_responses
FOR UPDATE
TO authenticated
USING (
  sale_id IN (
    SELECT sales.id FROM sales
    WHERE sales.company_id IN (
      SELECT profiles.company_id FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
    )
  )
)
WITH CHECK (
  sale_id IN (
    SELECT sales.id FROM sales
    WHERE sales.company_id IN (
      SELECT profiles.company_id FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Authenticated users can delete template responses" ON public.template_responses;
CREATE POLICY "Authenticated users can delete template responses"
ON public.template_responses
FOR DELETE
TO authenticated
USING (
  sale_id IN (
    SELECT sales.id FROM sales
    WHERE sales.company_id IN (
      SELECT profiles.company_id FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
    )
  )
);


-- ---------------------------------------------------------------------
-- VERIFICACIÓN — correr después; debe devolver 3 filas en OK
-- ---------------------------------------------------------------------
SELECT 'PLAN Plan Materno' AS chequeo,
       CASE WHEN EXISTS (
         SELECT 1 FROM plans
         WHERE lower(btrim(name)) = 'plan materno' AND is_active
       ) THEN 'OK' ELSE 'FALTA' END AS estado
UNION ALL
SELECT 'RLS UPDATE template_responses',
       CASE WHEN EXISTS (
         SELECT 1 FROM pg_policies
         WHERE tablename = 'template_responses' AND cmd = 'UPDATE'
       ) THEN 'OK' ELSE 'FALTA' END
UNION ALL
SELECT 'RLS DELETE template_responses',
       CASE WHEN EXISTS (
         SELECT 1 FROM pg_policies
         WHERE tablename = 'template_responses' AND cmd = 'DELETE'
       ) THEN 'OK' ELSE 'FALTA' END;
