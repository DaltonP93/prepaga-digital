import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Valores de PRODUCCIÓN (fuente de verdad). CUALQUIER build de producción
// (`vite build`, incluido el del Dockerfile y los modos us/br) usa SIEMPRE estos
// valores → es imposible que un build apunte a otra base por accidente.
const PROD_SUPABASE_URL = "https://ejiycfqxgtrzaysgpzmx.supabase.co";
const PROD_SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqaXljZnF4Z3RyemF5c2dwem14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMTY1MDgsImV4cCI6MjA4OTg5MjUwOH0.U0n0WlIsSbqC8W5uEXOyjDB8kX3mI9WBc0dBwBxgASg";

// Solo en DESARROLLO (`vite dev`, import.meta.env.DEV === true) se permite
// sobreescribir con VITE_SUPABASE_URL/KEY desde `.env.local` (gitignored), para
// apuntar a una base local/dev y que `npm run dev` NO pegue contra producción.
// En cualquier `vite build` (producción) import.meta.env.DEV es false → se ignora el env.
const isDev = import.meta.env.DEV === true;
const devUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const devKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim();

export const SUPABASE_URL = isDev && devUrl ? devUrl : PROD_SUPABASE_URL;
export const SUPABASE_PUBLISHABLE_KEY = isDev && devKey ? devKey : PROD_SUPABASE_PUBLISHABLE_KEY;
export const SUPABASE_PROJECT_REF =
  SUPABASE_URL.match(/^https:\/\/([a-z0-9]+)\.supabase\.co$/i)?.[1] ?? null;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
