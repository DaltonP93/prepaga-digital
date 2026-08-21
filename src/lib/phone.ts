// ============================================================================
// Teléfonos — única fuente de verdad del frontend
//
// Contexto: el sistema asumía Paraguay en todas las capas. El input pintaba un
// "+595" fijo, así que un vendedor cargó un número brasileño sin código de país
// y su WhatsApp de firma nunca llegó. Antes de esto la lógica estaba triplicada
// y divergente: ClientForm.normalizePhone (sólo entendía +595 y el 0 inicial),
// SignatureWorkflow.normalizePhoneForSending (borraba el '+') y un `+595${...}`
// hardcodeado en SignatureView.
//
// El formato canónico es E.164: '+595981234567', '+5521995126800'.
//
// IMPORTANTE — `toE164` es una heurística determinista propia, NO delega en
// libphonenumber-js. Tiene que dar exactamente el mismo resultado que
// supabase/functions/_shared/phone.ts y que public.normalize_phone_e164() en la
// base, porque los tres interpretan los mismos datos legacy. Está verificada
// contra los mismos 22 casos. Si cambia una, cambian las tres.
//
// libphonenumber-js se usa para lo que sí aporta: validar según las reglas de
// cada país, formatear para mostrar y alimentar el selector de países.
// ============================================================================

import {
  parsePhoneNumberFromString,
  getCountries,
  getCountryCallingCode,
  type CountryCode,
} from "libphonenumber-js";
import { z } from "zod";

export type { CountryCode };

export type PhoneIssue = "empty" | "invalid" | "ambiguous";

export interface PhoneParse {
  /** true si se pudo llevar a E.164 */
  ok: boolean;
  /** El número en E.164, o null si no se pudo determinar */
  e164: string | null;
  /** País detectado (ISO alpha-2) */
  country: CountryCode | null;
  /** El número sin el código de país, para mostrar en el input */
  national: string | null;
  issue?: PhoneIssue;
  raw: string;
}

/** País por defecto del sistema. Paraguay salvo que la empresa configure otro. */
const FALLBACK_COUNTRY: CountryCode = "PY";
let defaultCountry: CountryCode = FALLBACK_COUNTRY;

export function getDefaultCountry(): CountryCode {
  return defaultCountry;
}

/**
 * Cambia el país por defecto. Se llama una vez al cargar la configuración de la
 * empresa; una prepaga paraguaya con cartera brasileña puede querer otro.
 */
export function setDefaultCountry(cc: string | null | undefined): void {
  if (!cc) return;
  const upper = cc.toUpperCase() as CountryCode;
  if ((getCountries() as string[]).includes(upper)) {
    defaultCountry = upper;
  }
}

/** Códigos de país E.164 asignados. Conservadora a propósito: si no reconoce el
 *  prefijo, el número queda sin normalizar en vez de inventarle un país. Por eso
 *  '21995126800' NO se convierte en un '+219...' falso. */
const COUNTRY_CODES: Set<string> = new Set(
  (getCountries() as CountryCode[]).map((c) => getCountryCallingCode(c) as string),
);

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
 * Normaliza cualquier entrada a E.164. Devuelve `null` si no puede determinarla
 * con certeza — NUNCA inventa un prefijo de país.
 *
 * Tolera el formato legacy (9 dígitos sin país, con 0 inicial, con separadores),
 * que es lo que permite seguir leyendo la base sin migrar y que el vendedor siga
 * tipeando '981234567' como siempre.
 *
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
  country?: CountryCode,
): string | null {
  if (!raw) return null;

  const s = String(raw).trim();
  if (!s) return null;

  // (1) Si tiene letras no es un teléfono.
  if (/[A-Za-z]/.test(s)) return null;

  let hadPlus = s.startsWith("+");
  let digits = s.replace(/\D/g, "");
  if (!digits) return null;

  // (2) Prefijo internacional marcado como '00'
  if (!hadPlus && digits.startsWith("00")) {
    digits = digits.replace(/^0+/, "");
    hadPlus = true;
  }

  // (3) Ya venía con '+'
  if (hadPlus) {
    if (digits.length >= 7 && digits.length <= 15 && !digits.startsWith("0")) {
      return `+${digits}`;
    }
    return null;
  }

  const cc = getCountryCallingCode(country || defaultCountry) as string;

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

/**
 * Interpreta una entrada y devuelve todo lo que el `PhoneInput` necesita:
 * el E.164, el país detectado y la parte nacional para mostrar en el campo.
 */
export function parsePhone(
  raw: string | null | undefined,
  country?: CountryCode,
): PhoneParse {
  const rawStr = raw ? String(raw) : "";

  if (!rawStr.trim()) {
    return { ok: false, e164: null, country: null, national: null, issue: "empty", raw: rawStr };
  }

  const e164 = toE164(rawStr, country);
  if (!e164) {
    return { ok: false, e164: null, country: null, national: null, issue: "ambiguous", raw: rawStr };
  }

  const parsed = parsePhoneNumberFromString(e164);
  return {
    ok: true,
    e164,
    country: (parsed?.country as CountryCode) ?? null,
    national: parsed?.nationalNumber ? String(parsed.nationalNumber) : null,
    issue: parsed?.isValid() ? undefined : "invalid",
    raw: rawStr,
  };
}

/**
 * Validación real contra las reglas del país (no sólo la longitud).
 * Se usa para advertir, NO para bloquear: un teléfono raro no puede impedir que
 * se guarde una venta.
 */
export function isValidPhone(
  raw: string | null | undefined,
  country?: CountryCode,
): boolean {
  const e164 = toE164(raw, country);
  if (!e164) return false;
  return parsePhoneNumberFromString(e164)?.isValid() ?? false;
}

/** Para mostrar en pantalla: '+55 21 99512-6800'. Nunca rompe: si no puede
 *  formatear, devuelve lo que había. */
export function formatPhoneDisplay(raw: string | null | undefined): string {
  if (!raw) return "";
  const e164 = toE164(raw);
  if (!e164) return String(raw);
  return parsePhoneNumberFromString(e164)?.formatInternational() ?? e164;
}

// --- Formato por proveedor -------------------------------------------------

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

/** Enmascara para mostrar a dónde se envió un código. */
export function maskPhone(value: string | null | undefined): string {
  if (!value || value.length <= 4) return "****";
  return value.slice(0, -4).replace(/[0-9]/g, "*") + value.slice(-4);
}

// --- Selector de países ----------------------------------------------------

export interface CountryOption {
  code: CountryCode;
  callingCode: string;
  label: string;
}

/** Países más usados por el negocio, primero en el selector. */
const PRIORITY_COUNTRIES: CountryCode[] = ["PY", "BR", "AR", "UY", "BO", "CL", "US", "ES"];

const displayNames =
  typeof Intl !== "undefined" && "DisplayNames" in Intl
    ? new Intl.DisplayNames(["es"], { type: "region" })
    : null;

/** Lista para el combobox de país, con los del negocio arriba. */
export function getCountryOptions(): CountryOption[] {
  const all = getCountries() as CountryCode[];
  const toOption = (code: CountryCode): CountryOption => ({
    code,
    callingCode: getCountryCallingCode(code) as string,
    label: displayNames?.of(code) ?? code,
  });

  const priority = PRIORITY_COUNTRIES.filter((c) => all.includes(c)).map(toOption);
  const rest = all
    .filter((c) => !PRIORITY_COUNTRIES.includes(c))
    .map(toOption)
    .sort((a, b) => a.label.localeCompare(b.label, "es"));

  return [...priority, ...rest];
}

/** Bandera emoji a partir del código ISO, para el selector. */
export function countryFlag(code: CountryCode): string {
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split("")
      .map((c) => 0x1f1a5 + c.charCodeAt(0)),
  );
}

// --- Validación de formularios ---------------------------------------------

/**
 * Schema zod reutilizable. Por defecto NO bloquea números ambiguos (sólo exige
 * que haya algo si es requerido): frenar el alta de una venta por un teléfono
 * mal tipeado sería una regresión respecto de cómo funciona hoy.
 * Con `strict: true` sí exige un número válido.
 */
export const phoneSchema = (opts?: { required?: boolean; strict?: boolean }) => {
  const { required = false, strict = false } = opts ?? {};

  let schema = z.string().trim();

  const base = schema.refine(
    (v) => !strict || !v || isValidPhone(v),
    { message: "El número de teléfono no es válido. Verificá el código de país." },
  );

  return required
    ? base.refine((v) => !!v, { message: "El teléfono es obligatorio" })
    : base.optional().or(z.literal(""));
};
