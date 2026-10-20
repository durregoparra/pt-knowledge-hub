import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { fetchAllRows, fetchUserEmails } from '@/lib/admin-data';
import { KNOWLEDGE_COLUMNS, type Knowledge } from '@/lib/knowledge';
import { replaceKnowledge } from '@/lib/knowledge-replace';
import { getServerSupabase } from '@/lib/supabase-server';
import { readJsonObject } from '@/lib/validation';

export async function GET() {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;

  try {
    const [docs, emails] = await Promise.all([
      fetchAllRows<Knowledge & { user_id: string }>('knowledge', `${KNOWLEDGE_COLUMNS}, user_id`),
      fetchUserEmails(),
    ]);
    const rows = docs.map(({ user_id, ...doc }) => ({ ...doc, owner: emails.get(user_id) ?? '' }));
    return NextResponse.json({ ok: true, rows });
  } catch (err) {
    console.error('admin knowledge read failed', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// The admin replaces any user's document (the hub calls this when the duplicate belongs to
// someone else). The secret key passes replace_knowledge()'s owner check; the owner is kept.
export async function PATCH(request: Request) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;

  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ ok: false }, { status: 400 });
  return replaceKnowledge(getServerSupabase(), body);
}
