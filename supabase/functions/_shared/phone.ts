// ============================================================================
// Normalización de teléfonos a E.164 — módulo compartido de edge functions
//
// Contexto: el sistema asumía Paraguay en todas las capas. Un cliente brasileño
// (+55 21 99512-6800) se guardó mutilado y su WhatsApp nunca llegó. Antes de
// esto la lógica estaba copiada y divergente en send-whatsapp, en
// finalize-signature-link y en signature-otp, cada una con su propia heurística
// de anteponer '595'. Ésta es la única fuente de verdad del backend.
//
// SIN DEPENDENCIAS A PROPÓSITO: el front usa libphonenumber-js (necesita
// validar por país y formatear mientras se tipea), pero acá una dependencia npm
// que falle al cargar deja sin WhatsApp a todo el sistema. La heurística de
// abajo es idéntica a la de public.normalize_phone_e164() en la DB y a la de
// src/lib/phone.ts. Si cambia una, cambian las tres.
// ============================================================================

/** Códigos de país E.164 asignados. Conservadora a propósito: si no reconoce el
 *  prefijo, el número queda sin normalizar en vez de inventarle un país.
 *  Por eso '21995126800' NO se convierte en un '+219...' falso. */
const COUNTRY_CODES = new Set([
  "1", "7",
  "20", "27", "30", "31", "32", "33", "34", "36", "39",
  "40", "41", "43", "44", "45", "46", "47", "48", "49",
  "51", "52", "53", "54", "55", "56", "57", "58",
  "60", "61", "62", "63", "64", "65", "66",
  "81", "82", "84", "86", "90", "91", "92", "93", "94", "95", "98",
  "211", "212", "213", "216", "218",
  "220", "221", "222", "223", "224", "225", "226", "227", "228", "229",
  "230", "231", "232", "233", "234", "235", "236", "237", "238", "239",
  "240", "241", "242", "243", "244", "245", "246", "248", "249",
  "250", "251", "252", "253", "254", "255", "256", "257", "258",
  "260", "261", "262", "263", "264", "265", "266", "267", "268", "269",
  "290", "291", "297", "298", "299",
  "350", "351", "352", "353", "354", "355", "356", "357", "358", "359",
  "370", "371", "372", "373", "374", "375", "376", "377", "378", "379",
  "380", "381", "382", "383", "385", "386", "387", "389",
  "420", "421", "423",
  "500", "501", "502", "503", "504", "505", "506", "507", "508", "509",
  "590", "591", "592", "593", "594", "595", "596", "597", "598", "599",
  "670", "672", "673", "674", "675", "676", "677", "678", "679",
  "680", "681", "682", "683", "685", "686", "687", "688", "689",
  "690", "691", "692",
  "850", "852", "853", "855", "856", "870", "880", "886",
  "960", "961", "962", "963", "964", "965", "966", "967", "968",
  "970", "971", "972", "973", "974", "975", "976", "977", "979",
  "992", "993", "994", "995", "996", "998",
]);

/** Código del país por defecto, en dígitos. Paraguay salvo que se indique otro. */
const DEFAULT_CC = "595";

/** ¿Los dígitos empiezan con un código de país asignado? */
function hasCountryCode(digits: string): boolean {
  return (
    COUNTRY_CODES.has(digits.slice(0, 1)) ||
    COUNTRY_CODES.has(digits.slice(0, 2)) ||
    COUNTRY_CODES.has(digits.slice(0, 3))
  );
}

/** ¿Ya está en formato E.164 canónico? */
export function isE164(value: string | null | undefined): boolean {
  return !!value && /^\+[1-9][0-9]{6,14}$/.test(value);
}

/**
 * Normaliza cualquier entrada a E.164. Devuelve `null` si no puede
 * determinarla con certeza — NUNCA inventa un prefijo de país.
 *
 * Tolera el formato legacy (9 dígitos sin país, con 0 inicial, con separadores),
 * que es lo que da compatibilidad hacia atrás mientras la base todavía no está
 * migrada. Orden de interpretación:
 *   1. Vacío o con letras (ej: un email cargado por error) -> null
 *   2. '00...' -> se trata como '+...'
 *   3. Empieza con '+' -> se valida como internacional
 *   4. Empieza con '0'  -> nacional del país por defecto
 *   5. 9 dígitos        -> nacional del país por defecto (cubre ~98% de la base)
 *   6. 11-15 dígitos con código de país asignado -> internacional sin '+'
 *   7. Cualquier otra cosa -> null (ambiguo)
 */
export function toE164(
  raw: string | null | undefined,
  defaultCc: string = DEFAULT_CC,
): string | null {
  if (!raw) return null;

  const s = String(raw).trim();
  if (!s) return null;

  // (1) Si tiene letras no es un teléfono (hay al menos un email cargado en
  // sales.billing_phone).
  if (/[A-Za-z]/.test(s)) return null;

  let hadPlus = s.startsWith("+");
  let digits = s.replace(/\D/g, "");
  if (!digits) return null;

  // (2) Prefijo internacional marcado como '00'
  if (!hadPlus && digits.startsWith("00")) {
    digits = digits.replace(/^0+/, "");
    hadPlus = true;
  }

  // (3) Ya venía con '+': sólo se valida y se canoniza
  if (hadPlus) {
    if (digits.length >= 7 && digits.length <= 15 && !digits.startsWith("0")) {
      return `+${digits}`;
    }
    return null;
  }

  const cc = (defaultCc || DEFAULT_CC).replace(/\D/g, "") || DEFAULT_CC;

  // (4) '0' inicial -> número nacional (cubre móviles 0981... y fijos 021...)
  if (digits.startsWith("0")) {
    digits = digits.replace(/^0+/, "");
    if (digits.length === 9) return `+${cc}${digits}`;
    return null;
  }

  // (5) Longitud nacional de Paraguay: 9 dígitos (móviles 9xx y fijos 21x)
  if (digits.length === 9) return `+${cc}${digits}`;

  // (6) Internacional al que se le comió el '+'
  if (digits.length >= 11 && digits.length <= 15 && hasCountryCode(digits)) {
    return `+${digits}`;
  }

  // (7) Ambiguo
  return null;
}

// --- Formato por proveedor -------------------------------------------------
// Cada API de WhatsApp quiere el número distinto. Antes esto estaba resuelto
// (mal) en tres archivos diferentes.

/** Dígitos sin '+': lo que esperan wa.me y la Graph API de Meta. */
export function toWaDigits(e164: string): string {
  return e164.replace(/^\+/, "");
}

/** chatId de WAHA: '595981234567@c.us'. */
export function toWahaChatId(e164: string): string {
  if (e164.includes("@")) return e164;
  return `${toWaDigits(e164)}@c.us`;
}

/** Destinatario de Twilio: 'whatsapp:+595981234567' (Twilio sí quiere el '+'). */
export function toTwilioWhatsApp(e164: string): string {
  return `whatsapp:${e164.startsWith("+") ? e164 : `+${e164}`}`;
}

/** Enmascara para logs y para mostrarle al firmante a dónde se envió el código. */
export function maskPhone(value: string): string {
  if (!value) return "****";
  if (value.length <= 4) return "****";
  return value.slice(0, -4).replace(/[0-9]/g, "*") + value.slice(-4);
}
