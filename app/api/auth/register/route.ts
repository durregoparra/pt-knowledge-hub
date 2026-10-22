import { NextResponse } from 'next/server';
import { COMPANY_NAME_MAX } from '@/lib/company';
import { getMyCompany } from '@/lib/company-membership';
import { getSessionSupabase } from '@/lib/supabase-session';
import { PASSWORD_MIN, parseCompanyName, parseEmail, parsePassword, readJsonObject } from '@/lib/validation';

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
  const company = parseCompanyName(body.company, COMPANY_NAME_MAX);
  if (!company.ok) {
    return NextResponse.json({ ok: false, error: 'Enter the company you belong to.' }, { status: 400 });
  }

  // The company name travels as user metadata. A trigger on auth.users reads it in the same
  // transaction as the account insert, then creates or finds the company and links the user,
  // so the account, the company and the link are written together or not at all.
  const supabase = await getSessionSupabase();
  const { data, error } = await supabase.auth.signUp({
    email: email.value,
    password: password.value,
    options: { data: { company_name: company.value } },
  });
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
  if (!data.session) return NextResponse.json({ ok: true, confirm: true });

  // Read back what the trigger decided (it, not the earlier check, is authoritative: someone
  // else may have created the company in between). RLS returns only this user's own rows.
  let membership = null;
  try {
    membership = await getMyCompany(supabase);
  } catch (err) {
    console.error('register: company read failed', err);
  }
  return NextResponse.json({ ok: true, confirm: false, company: membership });
}
