import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

export type SessionUser = { id: string; email: string };

// Supabase client that acts as the signed-in user: publishable key plus the session kept in
// cookies, so RLS applies. Server only — the browser never holds a Supabase client.
export async function getSessionSupabase(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Components cannot write cookies; proxy.ts keeps the session fresh instead.
          }
        },
      },
    }
  );
}

// The signed-in user, checked against Supabase Auth; null when there is no valid session.
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await getSessionSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? '' };
}
