import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Valores de PRODUCCIÓN (fuente de verdad). CUALQUIER build de producción
// (`vite build`, incluido el del Dockerfile y los modos us/br) usa SIEMPRE estos
// valores → es imposible que un build apunte a otra base por accidente.
const PROD_SUPABASE_URL = "https://ejiycfqxgtrzaysgpzmx.supabase.co";
const PROD_SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqaXljZnF4Z3RyemF5c2dwem14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMTY1MDgsImV4cCI6MjA4OTg5MjUwOH0.U0n0WlIsSbqC8W5uEXOyjDB8kX3mI9WBc0dBwBxgASg";
const TEST_US_PROJECT_REF = "ykducvvcjzdpoojxlsig";

// El override de base de datos SOLO se permite en dos casos explícitos:
//   1. `vite dev` (import.meta.env.DEV) → para desarrollo local con `.env.local`.
//   2. Build marcado explícitamente como TEST con VITE_ENV_TARGET=test
//      (lo setea `.env.us`, usado por `npm run build:us` para el demo de test).
// En CUALQUIER otro build —incluido `npm run build`, que es el que usa el
// Dockerfile de producción— se ignora el env y se usan los valores de PROD.
// Así es imposible que un build de producción apunte a otra base por accidente.
const isDev = import.meta.env.DEV === true;
// Un build cuenta como TEST si el modo es `us` (npm run build:us) o si el
// archivo de entorno lo marca con VITE_ENV_TARGET=test. Se aceptan las dos
// señales: `deploy:test` usa la segunda y los scripts de comisiones la primera.
const isTestUsBuild =
  !isDev &&
  (import.meta.env.MODE === "us" ||
    (import.meta.env.VITE_ENV_TARGET as string | undefined)?.trim().toLowerCase() === "test");
const configuredUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const configuredKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim();
const configuredProjectId = (
  import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined
)?.trim();

const configuredProjectRef = configuredUrl
  ?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co$/i)?.[1]
  ?.toLowerCase();

if (
  isTestUsBuild &&
  (configuredProjectRef !== TEST_US_PROJECT_REF || configuredProjectId !== TEST_US_PROJECT_REF)
) {
  throw new Error(
    `Build US bloqueado: VITE_SUPABASE_URL debe apuntar a ${TEST_US_PROJECT_REF}.`,
  );
}

if (isTestUsBuild && !configuredKey) {
  throw new Error("Build US bloqueado: falta VITE_SUPABASE_PUBLISHABLE_KEY.");
}

if (isTestUsBuild && configuredKey) {
  try {
    const payload = JSON.parse(atob(configuredKey.split(".")[1] ?? "")) as { ref?: string };
    if (payload.ref !== TEST_US_PROJECT_REF) {
      throw new Error("project ref inesperado");
    }
  } catch {
    throw new Error(
      `Build US bloqueado: la publishable key no pertenece a ${TEST_US_PROJECT_REF}.`,
    );
  }
}

export const SUPABASE_URL = isTestUsBuild
  ? configuredUrl!
  : isDev && configuredUrl
    ? configuredUrl
    : PROD_SUPABASE_URL;
export const SUPABASE_PUBLISHABLE_KEY = isTestUsBuild
  ? configuredKey!
  : isDev && configuredKey
    ? configuredKey
    : PROD_SUPABASE_PUBLISHABLE_KEY;

// 'test' | 'production' — informativo, para diagnóstico y trazabilidad del build.
export const ENV_TARGET =
  isTestUsBuild || (isDev && configuredUrl) ? 'test' : 'production';

export const SUPABASE_PROJECT_REF =
  SUPABASE_URL.match(/^https:\/\/([a-z0-9]+)\.supabase\.co$/i)?.[1] ?? null;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
