import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { getServerSupabase } from '@/lib/supabase-server';

type CompanyRow = { company_id: number; company_name: string; admin_email: string; company_members: { count: number }[] };

export async function GET() {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;

  const sb = getServerSupabase();
  const PAGE = 1000, rows: { company_id: number; company_name: string; admin_email: string; members: number }[] = [];
  try {
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await sb.from('companies')
        .select('company_id, company_name, admin_email, company_members(count)')
        .order('company_id', { ascending: false }).range(from, from + PAGE - 1)
        .returns<CompanyRow[]>();
      if (error) throw error;
      data.forEach(({ company_members, ...c }) => rows.push({ ...c, members: company_members[0]?.count ?? 0 }));
      if (data.length < PAGE) break;
    }
    return NextResponse.json({ ok: true, rows });
  } catch (err) {
    console.error('admin companies read failed', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
