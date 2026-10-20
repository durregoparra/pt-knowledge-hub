import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { fetchAllRows } from '@/lib/admin-data';

export async function GET() {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;

  try {
    const rows = await fetchAllRows('feedback', 'message, email, created_at');
    return NextResponse.json({ ok: true, rows });
  } catch (err) {
    console.error('admin feedback read failed', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
