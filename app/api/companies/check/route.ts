import { NextResponse } from 'next/server';
import { COMPANY_NAME_MAX } from '@/lib/company';
import { getSessionSupabase } from '@/lib/supabase-session';
import { parseCompanyName, readJsonObject } from '@/lib/validation';

// Used by the register form before signing up. Answers only whether a company with this
// name (after normalization) exists; company_exists() returns nothing else about it.
export async function POST(request: Request) {
  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ ok: false }, { status: 400 });

  const name = parseCompanyName(body.name, COMPANY_NAME_MAX);
  if (!name.ok) {
    return NextResponse.json({ ok: false, error: 'Enter your company name.' }, { status: 400 });
  }

  const supabase = await getSessionSupabase();
  const { data, error } = await supabase.rpc('company_exists', { name: name.value });
  if (error) {
    console.error('company check failed', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true, exists: data === true });
}
