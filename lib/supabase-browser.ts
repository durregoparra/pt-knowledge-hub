import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Browser Supabase client for the admin page (sign-in + reads as the signed-in user).
// Public settings only — safe to ship to the browser (access is enforced by RLS).
let client: SupabaseClient | undefined;

export function getBrowserSupabase(): SupabaseClient {
  client ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
  return client;
}
