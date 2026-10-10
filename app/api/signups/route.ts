import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { isBot, parseEmail, readJsonObject } from '@/lib/validation';

export async function POST(request: Request) {
  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ ok: false }, { status: 400 });
  if (isBot(body)) return NextResponse.json({ ok: true }); // honeypot: pretend it worked

  const email = parseEmail(body.email);
  if (!email.ok || !email.value) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    const { error } = await getServerSupabase().from('signups').insert({ email: email.value });
    // 23505 = already signed up — same answer
    if (error && error.code !== '23505') throw error;
  } catch (err) {
    console.error('signups insert failed', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
