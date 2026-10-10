import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { isBot, parseEmail, parseMessage, readJsonObject } from '@/lib/validation';

export async function POST(request: Request) {
  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ ok: false }, { status: 400 });
  if (isBot(body)) return NextResponse.json({ ok: true }); // honeypot: pretend it worked

  const message = parseMessage(body.message);
  const email = parseEmail(body.email);
  if (!message.ok || !email.ok) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    const { error } = await getServerSupabase()
      .from('feedback')
      .insert({ message: message.value, email: email.value });
    if (error) throw error;
  } catch (err) {
    console.error('feedback insert failed', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
