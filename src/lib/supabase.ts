import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type Joke = {
  id: number;
  setup: string;
  punchline: string;
  category: string;
  created_at: string;
};

/**
 * Builds a Supabase client from environment variables.
 * Returns null when the variables are missing so pages can show a clear
 * message instead of crashing.
 */
export function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, { auth: { persistSession: false } });
}
