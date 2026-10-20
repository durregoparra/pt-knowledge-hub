import { NextResponse } from 'next/server';
import { getSessionSupabase } from '@/lib/supabase-session';
import { parseEmail, readJsonObject } from '@/lib/validation';

export async function POST(request: Request) {
  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ ok: false }, { status: 400 });

  const email = parseEmail(body.email);
  const password = body.password;
  if (!email.ok || !email.value || typeof password !== 'string' || !password) {
    return NextResponse.json({ ok: false, error: 'Invalid email or password.' }, { status: 400 });
  }

  const supabase = await getSessionSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email: email.value, password });
  if (error) {
    if (error.code === 'email_not_confirmed') {
      return NextResponse.json({ ok: false, error: 'Confirm your email before signing in.' }, { status: 401 });
    }
    if (error.status === 400) {
      return NextResponse.json({ ok: false, error: 'Invalid email or password.' }, { status: 401 });
    }
    console.error('login failed', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
