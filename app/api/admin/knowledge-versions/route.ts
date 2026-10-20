import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { fetchAllRows, fetchUserEmails } from '@/lib/admin-data';
import { KNOWLEDGE_VERSION_COLUMNS, type KnowledgeVersion } from '@/lib/knowledge-versions';

export async function GET() {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;

  try {
    const [versions, emails] = await Promise.all([
      fetchAllRows<KnowledgeVersion & { user_id: string }>('knowledge_versions', `${KNOWLEDGE_VERSION_COLUMNS}, user_id`),
      fetchUserEmails(),
    ]);
    const rows = versions.map(({ user_id, ...version }) => ({ ...version, owner: emails.get(user_id) ?? '' }));
    return NextResponse.json({ ok: true, rows });
  } catch (err) {
    console.error('admin knowledge versions read failed', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
