import { NextResponse } from 'next/server';
import { getSessionSupabase } from '@/lib/supabase-session';
import { KNOWLEDGE_VERSION_COLUMNS } from '@/lib/knowledge-versions';

// Earlier versions of the signed-in user's documents. Publishable key + session, so RLS
// limits it to versions the user owns. Versions are written only by PATCH /api/knowledge.
export async function GET() {
  const supabase = await getSessionSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ ok: false }, { status: 401 });

  const { data, error } = await supabase.from('knowledge_versions').select(KNOWLEDGE_VERSION_COLUMNS)
    .order('replaced_at', { ascending: false });
  if (error) {
    console.error('knowledge versions read failed', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true, rows: data });
}
