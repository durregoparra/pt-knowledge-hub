import { NextResponse } from 'next/server';
import { getSessionSupabase } from '@/lib/supabase-session';
import { PASSWORD_MIN, parseEmail, parsePassword, readJsonObject } from '@/lib/validation';

export async function POST(request: Request) {
  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ ok: false }, { status: 400 });

  const email = parseEmail(body.email);
  if (!email.ok || !email.value) {
    return NextResponse.json({ ok: false, error: 'Enter a valid email.' }, { status: 400 });
  }
  const password = parsePassword(body.password);
  if (!password.ok) {
    return NextResponse.json({ ok: false, error: `Use a password of at least ${PASSWORD_MIN} characters.` }, { status: 400 });
  }

  const supabase = await getSessionSupabase();
  const { data, error } = await supabase.auth.signUp({ email: email.value, password: password.value });
  if (error) {
    if (error.code === 'user_already_exists') {
      return NextResponse.json({ ok: false, error: 'An account with this email already exists.' }, { status: 409 });
    }
    if (error.code === 'weak_password') {
      return NextResponse.json({ ok: false, error: 'That password is too weak. Try a longer one.' }, { status: 400 });
    }
    console.error('register failed', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  // No session means the project asks new users to confirm their email first.
  return NextResponse.json({ ok: true, confirm: !data.session });
}
