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
