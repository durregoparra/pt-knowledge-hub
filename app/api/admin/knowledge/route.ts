import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { fetchAllRows, fetchUserEmails } from '@/lib/admin-data';
import { KNOWLEDGE_COLUMNS, type Knowledge } from '@/lib/knowledge';

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
