import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { fetchMemberships, fetchUsers } from '@/lib/admin-data';

// Every registered account with its company and whether it administers that company.
export async function GET() {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;

  try {
    const [users, memberships] = await Promise.all([fetchUsers(), fetchMemberships()]);
    const rows = users
      .map((u) => {
        const m = memberships.get(u.id);
        return { id: u.id, email: u.email ?? '', company: m?.companyName ?? '', is_admin: m?.isAdmin ?? false, created_at: u.created_at };
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return NextResponse.json({ ok: true, rows });
  } catch (err) {
    console.error('admin users read failed', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
