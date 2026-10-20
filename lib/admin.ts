import 'server-only';
import { NextResponse } from 'next/server';
import { getSessionUser, type SessionUser } from '@/lib/supabase-session';

// ADMIN_EMAILS is a comma-separated list in .env.local. Empty or missing means nobody is admin.
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  return admins.includes(email.trim().toLowerCase());
}

// Gate for the admin API routes, which read with the secret key: call this first and
// return `response` when it is set.
export async function requireAdmin(): Promise<{ user: SessionUser; response?: undefined } | { response: NextResponse }> {
  const user = await getSessionUser();
  if (!user) return { response: NextResponse.json({ ok: false }, { status: 401 }) };
  if (!isAdminEmail(user.email)) return { response: NextResponse.json({ ok: false }, { status: 403 }) };
  return { user };
}
