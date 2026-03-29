// Supabase client — single instance for the entire app
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://ejiycfqxgtrzaysgpzmx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqaXljZnF4Z3RyemF5c2dwem14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMTY1MDgsImV4cCI6MjA4OTg5MjUwOH0.U0n0WlIsSbqC8W5uEXOyjDB8kX3mI9WBc0dBwBxgASg";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});