import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Lee de variables de entorno (Vite) si están definidas, con FALLBACK a producción.
// Producción (build de Lovable) sigue funcionando aunque no haya env vars.
// Para desarrollo local: crear `.env.local` (gitignored) con VITE_SUPABASE_URL y
// VITE_SUPABASE_PUBLISHABLE_KEY apuntando a tu base de DEV (local o proyecto aparte),
// así `npm run dev` NO pega contra la base de producción.
const PROD_SUPABASE_URL = "https://ejiycfqxgtrzaysgpzmx.supabase.co";
const PROD_SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqaXljZnF4Z3RyemF5c2dwem14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMTY1MDgsImV4cCI6MjA4OTg5MjUwOH0.U0n0WlIsSbqC8W5uEXOyjDB8kX3mI9WBc0dBwBxgASg";

export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || PROD_SUPABASE_URL;
export const SUPABASE_PUBLISHABLE_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() || PROD_SUPABASE_PUBLISHABLE_KEY;
export const SUPABASE_PROJECT_REF =
  SUPABASE_URL.match(/^https:\/\/([a-z0-9]+)\.supabase\.co$/i)?.[1] ?? null;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
