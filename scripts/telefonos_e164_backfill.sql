-- ############################################################################
-- TELEFONOS E.164 - Backfill y triggers
-- Para pegar en: Supabase Dashboard -> SQL Editor
--
-- ####  NO EJECUTAR ANTES DE DESPLEGAR finalize-signature-link  ####
--
-- Por que: la version desplegada de finalize-signature-link todavia concatena
-- '595' sin condicion. Con los datos ya en E.164 mandaria '595+595981234567',
-- o sea que los WhatsApp de los clientes PARAGUAYOS irian a un numero
-- equivocado. Verificado con una prueba real.
--
-- El PASO 0 de abajo corta la ejecucion si el deploy no se hizo: cambiá el
-- valor a true recien cuando finalize-signature-link este desplegada.
-- ############################################################################

-- ============================ PASO 0: guarda ================================
DO $$
DECLARE
  finalize_ya_desplegada boolean := false;  -- <<< CAMBIAR A true DESPUES DEL DEPLOY
BEGIN
  IF NOT finalize_ya_desplegada THEN
    RAISE EXCEPTION
      'DETENIDO: primero desplegá finalize-signature-link. Si ya lo hiciste, poné finalize_ya_desplegada := true en el PASO 0 y volvé a ejecutar.';
  END IF;
END $$;


-- ==================== PASO 1: backfill (parte 2/3) =======================

-- ============================================================================
-- Teléfonos internacionales — Parte 2/3: backfill a E.164
--
-- ⚠️ ORDEN OBLIGATORIO: esta migración va DESPUÉS de desplegar las edge
-- functions normalizadas. El código viejo concatenaba '595' sin condición, así
-- que con un dato ya en E.164 produciría '595+595981234567' y rompería TODOS
-- los envíos, incluidos los paraguayos. El código nuevo, en cambio, tolera los
-- dos formatos — por eso backend primero y datos después.
--
-- Toca únicamente columnas de teléfono. NO toca token, status, expires_at ni
-- is_active de signature_links: una firma en curso no se ve afectada.
--
-- Idempotente: sólo actúa sobre filas que todavía no están en E.164.
-- Reversible: cada cambio queda registrado en phone_migration_backup.
-- ============================================================================

-- Respaldo de todo lo que se modifique, para poder revertir fila por fila.
CREATE TABLE IF NOT EXISTS public.phone_migration_backup (
  id          bigserial PRIMARY KEY,
  table_name  text        NOT NULL,
  row_id      uuid        NOT NULL,
  column_name text        NOT NULL,
  old_value   text,
  new_value   text,
  migrated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.phone_migration_backup IS
  'Respaldo del backfill de telefonos a E.164 (2026-08-21). Permite revertir: UPDATE t SET col = old_value FROM phone_migration_backup ...';

ALTER TABLE public.phone_migration_backup ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS phone_migration_backup_admin_read ON public.phone_migration_backup;
CREATE POLICY phone_migration_backup_admin_read
  ON public.phone_migration_backup FOR SELECT TO authenticated
  USING ((select public.get_user_role((select auth.uid()))) = 'super_admin'::app_role);


-- Backfill genérico: registra el cambio y normaliza, sólo donde hace falta.
DO $$
DECLARE
  t   record;
  sql text;
  n   integer;
BEGIN
  FOR t IN
    SELECT * FROM (VALUES
      ('clients',          'phone'),
      ('beneficiaries',    'phone'),
      ('signature_links',  'recipient_phone'),
      ('sales',            'signer_phone'),
      ('sales',            'billing_phone'),
      ('profiles',         'phone'),
      ('companies',        'phone'),
      ('company_settings', 'contratada_signer_phone')
      -- whatsapp_messages.phone_number queda AFUERA a propósito: es log
      -- histórico, nadie lo lee para enviar, y migrarlo sería riesgo sin
      -- beneficio. Los mensajes nuevos ya se registran en E.164.
    ) AS v(tbl, col)
  LOOP
    -- 1) Respaldar lo que está por cambiar
    sql := format($f$
      INSERT INTO public.phone_migration_backup (table_name, row_id, column_name, old_value, new_value)
      SELECT %L, id, %L, %I, public.normalize_phone_e164(%I)
      FROM public.%I
      WHERE %I IS NOT NULL
        AND %I <> ''
        AND NOT public.phone_is_e164(%I)
        AND public.normalize_phone_e164(%I) IS DISTINCT FROM %I
    $f$, t.tbl, t.col, t.col, t.col, t.tbl, t.col, t.col, t.col, t.col, t.col);
    EXECUTE sql;

    -- 2) Normalizar
    sql := format($f$
      UPDATE public.%I
      SET %I = public.normalize_phone_e164(%I)
      WHERE %I IS NOT NULL
        AND %I <> ''
        AND NOT public.phone_is_e164(%I)
        AND public.normalize_phone_e164(%I) IS DISTINCT FROM %I
    $f$, t.tbl, t.col, t.col, t.col, t.col, t.col, t.col, t.col);
    EXECUTE sql;

    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE NOTICE 'backfill %.%: % filas', t.tbl, t.col, n;
  END LOOP;
END $$;


-- Rescate de los links que quedaron con un número no interpretable.
--
-- El teléfono se copiaba al signature_link al crearlo y no se volvía a
-- actualizar, así que hay links congelados con el número mutilado (el caso del
-- cliente brasileño: el link quedó con '21995126800', sin el '55'). Para esos
-- se hereda el teléfono del titular de la venta, que sí está bien.
--
-- Sólo links NO firmados: los completados y revocados son evidencia de una
-- firma real y no se tocan.
WITH rescatables AS (
  SELECT sl.id, c.phone AS phone_cliente
  FROM public.signature_links sl
  JOIN public.sales   s ON s.id = sl.sale_id
  JOIN public.clients c ON c.id = s.client_id
  WHERE sl.recipient_type = 'titular'
    AND sl.status IN ('pendiente', 'visto')
    AND c.phone IS NOT NULL
    AND public.phone_is_e164(c.phone)
    AND (sl.recipient_phone IS NULL OR NOT public.phone_is_e164(sl.recipient_phone))
), respaldo AS (
  INSERT INTO public.phone_migration_backup (table_name, row_id, column_name, old_value, new_value)
  SELECT 'signature_links', sl.id, 'recipient_phone (rescate)', sl.recipient_phone, r.phone_cliente
  FROM public.signature_links sl JOIN rescatables r ON r.id = sl.id
  RETURNING 1
)
UPDATE public.signature_links sl
SET recipient_phone = r.phone_cliente
FROM rescatables r
WHERE sl.id = r.id;


-- Resincronización de los links de titular que quedaron desfasados del cliente.
-- Mismo origen: el link se creaba con el teléfono del momento y corregir el
-- cliente después no lo actualizaba (el hook filtraba sólo los NULL).
WITH desfasados AS (
  SELECT sl.id, c.phone AS phone_cliente, sl.recipient_phone AS phone_link
  FROM public.signature_links sl
  JOIN public.sales   s ON s.id = sl.sale_id
  JOIN public.clients c ON c.id = s.client_id
  WHERE sl.recipient_type = 'titular'
    AND sl.status IN ('pendiente', 'visto')
    AND c.phone IS NOT NULL
    AND public.phone_is_e164(c.phone)
    AND sl.recipient_phone IS DISTINCT FROM c.phone
), respaldo AS (
  INSERT INTO public.phone_migration_backup (table_name, row_id, column_name, old_value, new_value)
  SELECT 'signature_links', d.id, 'recipient_phone (resync)', d.phone_link, d.phone_cliente
  FROM desfasados d
  RETURNING 1
)
UPDATE public.signature_links sl
SET recipient_phone = d.phone_cliente
FROM desfasados d
WHERE sl.id = d.id;


-- ==================== PASO 2: triggers (parte 3/3) =======================

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


-- ==================== PASO 3: verificacion ==============================
-- Las tres consultas de abajo son de control. Ejecutalas y mandame el
-- resultado.

-- (a) Cuantos telefonos quedaron fuera de E.164.
--     Esperado: 8 filas (los ambiguos conocidos, se corrigen a mano).
SELECT tabla, columna, valor FROM public.v_phone_migration_issues ORDER BY tabla, columna;

-- (b) Links de titular desfasados del cliente. Esperado: 0
SELECT count(*) AS links_desfasados
FROM signature_links sl
JOIN sales s   ON s.id = sl.sale_id
JOIN clients c ON c.id = s.client_id
WHERE sl.recipient_type = 'titular'
  AND sl.status IN ('pendiente','visto')
  AND sl.recipient_phone IS DISTINCT FROM c.phone;

-- (c) Resumen de lo migrado y del estado final.
SELECT
  (SELECT count(*) FROM phone_migration_backup)                                   AS filas_respaldadas,
  (SELECT count(*) FROM clients WHERE phone IS NOT NULL AND phone_is_e164(phone)) AS clientes_en_e164,
  (SELECT count(*) FROM signature_links
     WHERE recipient_phone IS NOT NULL AND phone_is_e164(recipient_phone))        AS links_en_e164,
  (SELECT count(*) FROM pg_trigger WHERE tgname LIKE 'trg_phone_e164%')           AS triggers_nuevos,
  (SELECT count(*) FROM pg_trigger WHERE tgname LIKE 'trg_normalize%phone%')      AS triggers_viejos_restantes;


-- ==================== SI ALGO SALE MAL: revertir =========================
-- Todo lo modificado quedo respaldado. Para volver atras una tabla:
--
-- UPDATE clients c SET phone = b.old_value
-- FROM phone_migration_backup b
-- WHERE b.table_name = 'clients' AND b.column_name = 'phone' AND b.row_id = c.id;
--
-- (idem para beneficiaries.phone, signature_links.recipient_phone,
--  sales.signer_phone, sales.billing_phone, profiles.phone, companies.phone)
