-- ============================================================================
-- Teléfonos internacionales — Parte 1/3: funciones canónicas (NO altera datos)
--
-- Contexto: el sistema asumía Paraguay en todas las capas. Un cliente brasileño
-- (+55 21 99512-6800) se guardó mutilado y su WhatsApp nunca llegó. A partir de
-- acá el formato canónico es E.164 ('+595981234567').
--
-- Esta migración SOLO crea funciones. No toca una sola fila y no cambia el
-- comportamiento de nada existente. El backfill y los triggers van en las
-- partes 2 y 3, después de desplegar las edge functions.
--
-- La heurística de abajo debe mantenerse IDÉNTICA a src/lib/phone.ts y a
-- supabase/functions/_shared/phone.ts. Si cambia una, cambian las tres.
-- ============================================================================

-- ¿El valor ya está en formato E.164 canónico?
CREATE OR REPLACE FUNCTION public.phone_is_e164(p text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p ~ '^\+[1-9][0-9]{6,14}$';
$$;

COMMENT ON FUNCTION public.phone_is_e164(text) IS
  'true si el texto es un teléfono en formato E.164 canónico (+ seguido de 7 a 15 dígitos, sin 0 inicial).';


-- ¿La secuencia de dígitos empieza con un código de país E.164 asignado?
-- Se usa para rescatar números internacionales a los que se les comió el '+'
-- (ej: '5521995126800'). Deliberadamente NO incluye códigos no asignados, para
-- que '21995126800' NO se convierta en un '+219...' inventado.
CREATE OR REPLACE FUNCTION public.phone_has_country_code(digits text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT digits ~ ('^(' ||
    -- 1 dígito
    '1|7|' ||
    -- 2 dígitos
    '20|27|30|31|32|33|34|36|39|40|41|43|44|45|46|47|48|49|' ||
    '51|52|53|54|55|56|57|58|60|61|62|63|64|65|66|' ||
    '81|82|84|86|90|91|92|93|94|95|98|' ||
    -- 3 dígitos
    '211|212|213|216|218|220|221|222|223|224|225|226|227|228|229|' ||
    '230|231|232|233|234|235|236|237|238|239|' ||
    '240|241|242|243|244|245|246|248|249|' ||
    '250|251|252|253|254|255|256|257|258|260|261|262|263|264|265|266|267|268|269|' ||
    '290|291|297|298|299|' ||
    '350|351|352|353|354|355|356|357|358|359|' ||
    '370|371|372|373|374|375|376|377|378|379|380|381|382|383|385|386|387|389|' ||
    '420|421|423|' ||
    '500|501|502|503|504|505|506|507|508|509|' ||
    '590|591|592|593|594|595|596|597|598|599|' ||
    '670|672|673|674|675|676|677|678|679|680|681|682|683|685|686|687|688|689|690|691|692|' ||
    '850|852|853|855|856|870|880|886|' ||
    '960|961|962|963|964|965|966|967|968|970|971|972|973|974|975|976|977|979|' ||
    '992|993|994|995|996|998' ||
  ')');
$$;

COMMENT ON FUNCTION public.phone_has_country_code(text) IS
  'true si los dígitos empiezan con un código de país E.164 asignado. Conservadora a propósito: si no reconoce el prefijo, el número queda sin normalizar en vez de inventarle un país.';


-- Normaliza cualquier entrada a E.164.
--
-- REGLA DURA: si no puede determinar el número con certeza, DEVUELVE EL VALOR
-- ORIGINAL SIN TOCAR. Nunca NULL, nunca error, nunca un prefijo inventado.
-- Un teléfono raro no puede impedir que se guarde una venta.
--
-- Orden de interpretación (idéntico en TS):
--   1. Vacío o con letras (ej: un email cargado por error) -> se devuelve tal cual
--   2. '00...' -> se trata como '+...'
--   3. Empieza con '+' -> se valida como internacional
--   4. Empieza con '0'  -> nacional del país por defecto
--   5. 9 dígitos        -> nacional del país por defecto (cubre ~98% de la base)
--   6. 11-15 dígitos con código de país asignado -> internacional sin '+'
--   7. Cualquier otra cosa -> se devuelve tal cual (ambiguo)
CREATE OR REPLACE FUNCTION public.normalize_phone_e164(raw text, default_cc text DEFAULT 'PY')
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  s          text;
  digits     text;
  had_plus   boolean;
  cc_digits  text;
BEGIN
  IF raw IS NULL THEN
    RETURN raw;
  END IF;

  s := btrim(raw);
  IF s = '' THEN
    RETURN raw;
  END IF;

  -- (1) Si tiene letras no es un teléfono. Hay al menos un email cargado en
  -- sales.billing_phone: se deja intacto para revisión manual.
  IF s ~ '[A-Za-z]' THEN
    RETURN raw;
  END IF;

  had_plus := s ~ '^\+';
  digits   := regexp_replace(s, '\D', '', 'g');

  IF digits = '' THEN
    RETURN raw;
  END IF;

  -- (2) Prefijo internacional marcado como '00'
  IF NOT had_plus AND digits ~ '^00' THEN
    digits   := regexp_replace(digits, '^0+', '');
    had_plus := true;
  END IF;

  -- (3) Ya venía con '+': sólo se valida y se canoniza
  IF had_plus THEN
    IF length(digits) BETWEEN 7 AND 15 AND digits !~ '^0' THEN
      RETURN '+' || digits;
    END IF;
    RETURN raw;
  END IF;

  -- Código del país por defecto (desde la tabla countries; PY como respaldo)
  SELECT regexp_replace(c.phone_code, '\D', '', 'g') INTO cc_digits
  FROM public.countries c
  WHERE upper(c.code) = upper(default_cc)
  LIMIT 1;

  IF cc_digits IS NULL OR cc_digits = '' THEN
    cc_digits := '595';
  END IF;

  -- (4) '0' inicial -> número nacional (cubre móviles 0981... y fijos 021...)
  IF digits ~ '^0' THEN
    digits := regexp_replace(digits, '^0+', '');
    IF length(digits) = 9 THEN
      RETURN '+' || cc_digits || digits;
    END IF;
    RETURN raw;
  END IF;

  -- (5) Longitud nacional de Paraguay: 9 dígitos (móviles 9xx y fijos 21x)
  IF length(digits) = 9 THEN
    RETURN '+' || cc_digits || digits;
  END IF;

  -- (6) Internacional al que se le comió el '+'
  IF length(digits) BETWEEN 11 AND 15 AND public.phone_has_country_code(digits) THEN
    RETURN '+' || digits;
  END IF;

  -- (7) Ambiguo: se preserva el original
  RETURN raw;
END;
$$;

COMMENT ON FUNCTION public.normalize_phone_e164(text, text) IS
  'Normaliza un teléfono a E.164. Si no puede determinarlo con certeza devuelve el valor original sin tocar (nunca NULL, nunca error, nunca un prefijo inventado).';


-- Lugar fijo donde mirar qué quedó fuera del formato canónico.
CREATE OR REPLACE VIEW public.v_phone_migration_issues AS
  SELECT 'clients'          AS tabla, 'phone'                   AS columna, id, phone                   AS valor FROM public.clients          WHERE phone                   IS NOT NULL AND phone                   <> '' AND NOT public.phone_is_e164(phone)
  UNION ALL
  SELECT 'beneficiaries',   'phone',                   id, phone                   FROM public.beneficiaries   WHERE phone                   IS NOT NULL AND phone                   <> '' AND NOT public.phone_is_e164(phone)
  UNION ALL
  SELECT 'signature_links', 'recipient_phone',         id, recipient_phone         FROM public.signature_links WHERE recipient_phone         IS NOT NULL AND recipient_phone         <> '' AND NOT public.phone_is_e164(recipient_phone)
  UNION ALL
  SELECT 'sales',           'signer_phone',            id, signer_phone            FROM public.sales           WHERE signer_phone            IS NOT NULL AND signer_phone            <> '' AND NOT public.phone_is_e164(signer_phone)
  UNION ALL
  SELECT 'sales',           'billing_phone',           id, billing_phone           FROM public.sales           WHERE billing_phone           IS NOT NULL AND billing_phone           <> '' AND NOT public.phone_is_e164(billing_phone)
  UNION ALL
  SELECT 'profiles',        'phone',                   id, phone                   FROM public.profiles        WHERE phone                   IS NOT NULL AND phone                   <> '' AND NOT public.phone_is_e164(phone)
  UNION ALL
  SELECT 'companies',       'phone',                   id, phone                   FROM public.companies       WHERE phone                   IS NOT NULL AND phone                   <> '' AND NOT public.phone_is_e164(phone)
  UNION ALL
  SELECT 'company_settings','contratada_signer_phone', id, contratada_signer_phone FROM public.company_settings WHERE contratada_signer_phone IS NOT NULL AND contratada_signer_phone <> '' AND NOT public.phone_is_e164(contratada_signer_phone);

COMMENT ON VIEW public.v_phone_migration_issues IS
  'Teléfonos que no están en E.164. Debe quedar vacía (salvo ambiguos conocidos) antes de validar los CHECK constraints.';
