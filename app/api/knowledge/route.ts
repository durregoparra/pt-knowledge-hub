import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSessionSupabase } from '@/lib/supabase-session';
import { isAdminEmail } from '@/lib/admin';
import { KNOWLEDGE_COLUMNS, KNOWLEDGE_TYPES, NAME_MAX, PATH_MAX, SOURCE_TYPES } from '@/lib/knowledge';
import type { KnowledgeConflict } from '@/lib/knowledge-versions';
import { NO_PERMISSION, replaceKnowledge } from '@/lib/knowledge-replace';
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
  if (error?.code === '23505') return conflictResponse(supabase, auth.user.email, name.value, knowledgeType.value, sourceType.value);
  if (error) {
    console.error('knowledge insert failed', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true, row: data });
}

// Replaces one of the user's own documents and saves the previous one as a version.
// The database refuses documents of other users (403); the admin uses /api/admin/knowledge.
export async function PATCH(request: Request) {
  const supabase = await getSessionSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ ok: false }, { status: 400 });
  return replaceKnowledge(supabase, body);
}

// A document with the same name, knowledge type and source type exists (it may belong to
// another user, which RLS hides, so knowledge_duplicate() looks it up). Tell the client
// whether this user may replace it.
async function conflictResponse(supabase: SupabaseClient, email: string | undefined, name: string, knowledgeType: string, sourceType: string) {
  const { data, error } = await supabase
    .rpc('knowledge_duplicate', { p_name: name, p_knowledge_type: knowledgeType, p_source_type: sourceType })
    .maybeSingle<{ id: number; is_owner: boolean }>();
  if (error || !data) {
    console.error('knowledge duplicate lookup failed', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  const conflict: KnowledgeConflict = { id: data.id, owner: data.is_owner, admin: isAdminEmail(email) };
  return NextResponse.json({
    ok: false,
    conflict,
    error: conflict.owner || conflict.admin ? 'A document with this name, knowledge type and source type already exists.' : NO_PERMISSION,
  }, { status: 409 });
}
