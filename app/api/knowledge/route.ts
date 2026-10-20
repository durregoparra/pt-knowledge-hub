import { NextResponse } from 'next/server';
import { getSessionSupabase } from '@/lib/supabase-session';
import { KNOWLEDGE_COLUMNS, KNOWLEDGE_TYPES, NAME_MAX, PATH_MAX, SOURCE_TYPES } from '@/lib/knowledge';
import { parseChoice, parseText, readJsonObject } from '@/lib/validation';

// The signed-in user's knowledge documents. Publishable key + session, so RLS limits every
// query to the user's own rows and fills in user_id and status itself.

export async function GET() {
  const supabase = await getSessionSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ ok: false }, { status: 401 });

  const { data, error } = await supabase.from('knowledge').select(KNOWLEDGE_COLUMNS)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('knowledge read failed', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true, rows: data });
}

export async function POST(request: Request) {
  const supabase = await getSessionSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ ok: false }, { status: 400 });

  const name = parseText(body.name, NAME_MAX);
  if (!name.ok) return NextResponse.json({ ok: false, error: `Enter a document name of up to ${NAME_MAX} characters.` }, { status: 400 });
  const path = parseText(body.path, PATH_MAX);
  if (!path.ok) return NextResponse.json({ ok: false, error: `Enter where the document lives, up to ${PATH_MAX} characters.` }, { status: 400 });
  const knowledgeType = parseChoice(body.knowledge_type, KNOWLEDGE_TYPES);
  if (!knowledgeType.ok) return NextResponse.json({ ok: false, error: 'Choose a knowledge type.' }, { status: 400 });
  const sourceType = parseChoice(body.source_type, SOURCE_TYPES);
  if (!sourceType.ok) return NextResponse.json({ ok: false, error: 'Choose a source type.' }, { status: 400 });

  const { data, error } = await supabase.from('knowledge')
    .insert({ name: name.value, path: path.value, knowledge_type: knowledgeType.value, source_type: sourceType.value })
    .select(KNOWLEDGE_COLUMNS)
    .single();
  if (error) {
    console.error('knowledge insert failed', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true, row: data });
}
