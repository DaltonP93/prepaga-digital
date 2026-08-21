-- ============================================================================
-- Teléfonos internacionales — Parte 3/3: triggers y red de seguridad
--
-- ⚠️ ORDEN: va DESPUÉS del backfill (parte 2).
--
-- Esta es la capa que sobrevive a que un deploy de Lovable pise el frontend:
-- aunque el formulario vuelva a mandar '981234567' pelado, la base lo guarda
-- normalizado igual.
--
-- Reemplaza a los 3 triggers viejos (normalize_client_phone,
-- normalize_beneficiary_phone, normalize_signature_link_phone) que sólo
-- quitaban el 0 inicial y no existían en ninguna migración del repo.
-- ============================================================================

-- Trigger genérico: recibe el nombre de la columna por TG_ARGV[0].
CREATE OR REPLACE FUNCTION public.tg_normalize_phone_e164()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  col      text := TG_ARGV[0];
  valor    text;
  normal   text;
  registro jsonb;
BEGIN
  registro := to_jsonb(NEW);
  valor    := registro ->> col;

  IF valor IS NULL OR btrim(valor) = '' THEN
    RETURN NEW;
  END IF;

  normal := public.normalize_phone_e164(valor);

  -- normalize_phone_e164 devuelve el original si no puede interpretarlo, así
  -- que un teléfono raro nunca impide guardar la fila.
  IF normal IS DISTINCT FROM valor THEN
    NEW := jsonb_populate_record(NEW, jsonb_build_object(col, normal));
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.tg_normalize_phone_e164() IS
  'Normaliza a E.164 la columna indicada en TG_ARGV[0]. Nunca bloquea el INSERT/UPDATE: si el numero es ambiguo lo deja como vino.';


-- Fuera los viejos (sólo quitaban el 0 inicial).
DROP TRIGGER IF EXISTS trg_normalize_client_phone         ON public.clients;
DROP TRIGGER IF EXISTS trg_normalize_beneficiary_phone    ON public.beneficiaries;
DROP TRIGGER IF EXISTS trg_normalize_signature_link_phone ON public.signature_links;
DROP FUNCTION IF EXISTS public.normalize_client_phone();
DROP FUNCTION IF EXISTS public.normalize_beneficiary_phone();
DROP FUNCTION IF EXISTS public.normalize_signature_link_phone();

-- Y los nuevos, ahora sobre las 8 columnas (antes sólo 3).
DROP TRIGGER IF EXISTS trg_phone_e164_clients ON public.clients;
CREATE TRIGGER trg_phone_e164_clients
  BEFORE INSERT OR UPDATE OF phone ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.tg_normalize_phone_e164('phone');

DROP TRIGGER IF EXISTS trg_phone_e164_beneficiaries ON public.beneficiaries;
CREATE TRIGGER trg_phone_e164_beneficiaries
  BEFORE INSERT OR UPDATE OF phone ON public.beneficiaries
  FOR EACH ROW EXECUTE FUNCTION public.tg_normalize_phone_e164('phone');

DROP TRIGGER IF EXISTS trg_phone_e164_signature_links ON public.signature_links;
CREATE TRIGGER trg_phone_e164_signature_links
  BEFORE INSERT OR UPDATE OF recipient_phone ON public.signature_links
  FOR EACH ROW EXECUTE FUNCTION public.tg_normalize_phone_e164('recipient_phone');

DROP TRIGGER IF EXISTS trg_phone_e164_sales_signer ON public.sales;
CREATE TRIGGER trg_phone_e164_sales_signer
  BEFORE INSERT OR UPDATE OF signer_phone ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.tg_normalize_phone_e164('signer_phone');

DROP TRIGGER IF EXISTS trg_phone_e164_sales_billing ON public.sales;
CREATE TRIGGER trg_phone_e164_sales_billing
  BEFORE INSERT OR UPDATE OF billing_phone ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.tg_normalize_phone_e164('billing_phone');

DROP TRIGGER IF EXISTS trg_phone_e164_profiles ON public.profiles;
CREATE TRIGGER trg_phone_e164_profiles
  BEFORE INSERT OR UPDATE OF phone ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_normalize_phone_e164('phone');

DROP TRIGGER IF EXISTS trg_phone_e164_companies ON public.companies;
CREATE TRIGGER trg_phone_e164_companies
  BEFORE INSERT OR UPDATE OF phone ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.tg_normalize_phone_e164('phone');

DROP TRIGGER IF EXISTS trg_phone_e164_company_settings ON public.company_settings;
CREATE TRIGGER trg_phone_e164_company_settings
  BEFORE INSERT OR UPDATE OF contratada_signer_phone ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_normalize_phone_e164('contratada_signer_phone');


-- ---------------------------------------------------------------------------
-- Propagación del teléfono corregido a los links pendientes.
--
-- Redundante a propósito con el hook useClients: si un deploy de Lovable
-- revierte el frontend, la propagación sigue viva acá.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_sync_client_phone_to_links()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.phone IS DISTINCT FROM OLD.phone
     AND NEW.phone IS NOT NULL
     AND public.phone_is_e164(NEW.phone) THEN
    -- Sólo links no firmados. Los completados/revocados son evidencia de una
    -- firma real y no se tocan.
    UPDATE public.signature_links sl
    SET recipient_phone = NEW.phone,
        updated_at      = now()
    FROM public.sales s
    WHERE s.id = sl.sale_id
      AND s.client_id = NEW.id
      AND sl.recipient_type = 'titular'
      AND sl.status IN ('pendiente', 'visto')
      AND sl.recipient_phone IS DISTINCT FROM NEW.phone;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.tg_sync_client_phone_to_links() IS
  'Propaga el telefono corregido del cliente a sus signature_links pendientes. Antes el link quedaba congelado con el numero viejo y el OTP seguia saliendo ahi.';

DROP TRIGGER IF EXISTS trg_sync_client_phone_to_links ON public.clients;
CREATE TRIGGER trg_sync_client_phone_to_links
  AFTER UPDATE OF phone ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.tg_sync_client_phone_to_links();


-- ---------------------------------------------------------------------------
-- Red final: CHECK en NOT VALID.
--
-- NOT VALID no revisa las filas existentes ni toma un lock largo, así que no
-- puede romper nada al aplicarse. Los ~8 registros ambiguos conocidos
-- (un email en billing_phone, un '123456', un numero de 8 digitos) quedan
-- tolerados hasta que se corrijan a mano.
--
-- Cuando v_phone_migration_issues quede vacía, validar con:
--   ALTER TABLE public.clients VALIDATE CONSTRAINT chk_clients_phone_e164;
-- ---------------------------------------------------------------------------
ALTER TABLE public.clients          DROP CONSTRAINT IF EXISTS chk_clients_phone_e164;
ALTER TABLE public.clients          ADD  CONSTRAINT chk_clients_phone_e164
  CHECK (phone IS NULL OR phone = '' OR public.phone_is_e164(phone)) NOT VALID;

ALTER TABLE public.beneficiaries    DROP CONSTRAINT IF EXISTS chk_beneficiaries_phone_e164;
ALTER TABLE public.beneficiaries    ADD  CONSTRAINT chk_beneficiaries_phone_e164
  CHECK (phone IS NULL OR phone = '' OR public.phone_is_e164(phone)) NOT VALID;

ALTER TABLE public.signature_links  DROP CONSTRAINT IF EXISTS chk_signature_links_phone_e164;
ALTER TABLE public.signature_links  ADD  CONSTRAINT chk_signature_links_phone_e164
  CHECK (recipient_phone IS NULL OR recipient_phone = '' OR public.phone_is_e164(recipient_phone)) NOT VALID;
