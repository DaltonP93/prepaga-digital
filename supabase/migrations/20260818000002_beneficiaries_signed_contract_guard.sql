-- Respaldo en la base del bloqueo de adherentes en contratos firmados.
--
-- Con el contrato firmado, la composición del grupo familiar ya quedó sellada en
-- un PDF con firma PAdES. Modificarla por atrás deja la base diciendo una cosa y
-- el documento firmado otra. La vía legítima para sumar gente es la
-- Incorporación de Adherente (anexo + firma propia).
--
-- El frontend ya rechaza estas mutaciones (canMutateBeneficiaries en
-- src/lib/saleUtils.ts + guarda en src/hooks/useBeneficiaries.ts). Esto es la
-- tercera capa: la UI antes sólo escondía botones, así que cualquier camino que
-- no pasara por ese componente escribía igual.
--
-- EXENCIONES
-- Cuatro funciones del sistema modifican adherentes de un contrato firmado por
-- diseño, y tienen que seguir funcionando:
--   activate_adherent_incorporation()        copia el adherente al contrato madre
--   complete_adherent_incorporation(uuid)    idem, por RPC desde el link de firma
--   approve_sale_addendum(uuid, text)        anexos
--   try_complete_sale_addendum_for_link(uuid)  anexos
--
-- Se las exime con `ALTER FUNCTION ... SET`, que fija la GUC mientras dura la
-- llamada, en vez de editar sus cuerpos: son funciones delicadas (la de
-- activación está marcada como intocable) y así su lógica queda idéntica.
-- Mismo patrón que `app.commission_rpc_mutation` en el módulo de comisiones.

CREATE OR REPLACE FUNCTION public.beneficiaries_block_when_sale_signed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sale_id uuid;
  v_status  text;
BEGIN
  -- Las funciones del sistema exentas fijan esta GUC vía ALTER FUNCTION ... SET.
  IF current_setting('app.allow_signed_beneficiary_mutation', true) = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_sale_id := COALESCE(NEW.sale_id, OLD.sale_id);

  SELECT s.status::text INTO v_status
  FROM public.sales s
  WHERE s.id = v_sale_id;

  IF v_status IN ('firmado_parcial', 'firmado', 'completado') THEN
    RAISE EXCEPTION
      'El contrato ya esta firmado (%): los adherentes no se pueden modificar. Use una Incorporacion de Adherente.',
      v_status
      USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS trg_beneficiaries_block_when_sale_signed ON public.beneficiaries;
CREATE TRIGGER trg_beneficiaries_block_when_sale_signed
  BEFORE INSERT OR UPDATE OR DELETE ON public.beneficiaries
  FOR EACH ROW
  EXECUTE FUNCTION public.beneficiaries_block_when_sale_signed();

-- Exenciones: la GUC queda en 'on' sólo mientras corre cada una de estas.
ALTER FUNCTION public.activate_adherent_incorporation()
  SET app.allow_signed_beneficiary_mutation = 'on';
ALTER FUNCTION public.complete_adherent_incorporation(uuid)
  SET app.allow_signed_beneficiary_mutation = 'on';
ALTER FUNCTION public.approve_sale_addendum(uuid, text)
  SET app.allow_signed_beneficiary_mutation = 'on';
ALTER FUNCTION public.try_complete_sale_addendum_for_link(uuid)
  SET app.allow_signed_beneficiary_mutation = 'on';

-- ---------------------------------------------------------------------
-- VERIFICACIÓN — las 2 filas deben decir OK
-- ---------------------------------------------------------------------
SELECT 'el trigger de bloqueo existe' AS chequeo,
       CASE WHEN EXISTS (
         SELECT 1 FROM pg_trigger
          WHERE tgname = 'trg_beneficiaries_block_when_sale_signed'
            AND tgrelid = 'public.beneficiaries'::regclass
            AND NOT tgisinternal)
       THEN 'OK' ELSE 'FALTA' END AS estado
UNION ALL
SELECT 'las 4 funciones del sistema estan exentas',
       CASE WHEN (
         SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public'
            AND p.proname IN ('activate_adherent_incorporation','complete_adherent_incorporation',
                              'approve_sale_addendum','try_complete_sale_addendum_for_link')
            AND array_to_string(p.proconfig, ',') LIKE '%allow_signed_beneficiary_mutation=on%'
       ) = 4 THEN 'OK' ELSE 'FALTAN EXENCIONES' END;
