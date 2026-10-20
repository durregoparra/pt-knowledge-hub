import 'server-only';
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PATH_MAX } from '@/lib/knowledge';
import { DESCRIPTION_MAX } from '@/lib/knowledge-versions';
import { parseId, parseText } from '@/lib/validation';

export const NO_PERMISSION = 'You do not have permission to replace this document. Please contact the administrator.';

// Replaces a knowledge document through replace_knowledge(), which first copies the current
// row into knowledge_versions. With the session client the database lets only the owner do
// it; with the secret key (admin routes only) it allows any document.
export async function replaceKnowledge(supabase: SupabaseClient, body: Record<string, unknown>) {
  const id = parseId(body.id);
  if (!id.ok) return NextResponse.json({ ok: false }, { status: 400 });
  const path = parseText(body.path, PATH_MAX);
  if (!path.ok) return NextResponse.json({ ok: false, error: `Enter where the document lives, up to ${PATH_MAX} characters.` }, { status: 400 });
  const description = parseText(body.description, DESCRIPTION_MAX);
  if (!description.ok) return NextResponse.json({ ok: false, error: `Describe what changes in this version, up to ${DESCRIPTION_MAX} characters.` }, { status: 400 });

  const { data, error } = await supabase
    .rpc('replace_knowledge', { p_knowledge_id: id.value, p_path: path.value, p_description: description.value })
    .single<{ version_number: number } & Record<string, unknown>>();
  if (error) {
    if (error.code === '42501') return NextResponse.json({ ok: false, error: NO_PERMISSION }, { status: 403 });
    if (error.code === 'P0002') return NextResponse.json({ ok: false, error: 'That document no longer exists.' }, { status: 404 });
    console.error('knowledge replace failed', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  const { version_number, ...row } = data;
  return NextResponse.json({ ok: true, row, version: version_number });
}
