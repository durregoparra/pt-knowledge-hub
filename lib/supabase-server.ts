import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Server-side Supabase client. Uses the secret key from .env.local, which bypasses RLS —
// every caller must validate its input before writing. Never import this from client code.
let client: SupabaseClient | undefined;

export function getServerSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local');
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
