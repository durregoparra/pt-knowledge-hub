import { NextResponse } from 'next/server';
import { getMyCompany } from '@/lib/company-membership';
import { KNOWLEDGE_COLUMNS, REVIEW_COMMENT_MAX, type Knowledge } from '@/lib/knowledge';
import { getSessionSupabase } from '@/lib/supabase-session';
import { parseText, readJsonObject } from '@/lib/validation';

// Review by the company administrator: every document of the company, and approving the
// pending ones with a comment. Publishable key + session, so RLS applies: it shows a company
// administrator their company's documents and allows only pending → approved with a comment.

type Gate =
  | { response: NextResponse; supabase?: never }
  | { response?: never; supabase: Awaited<ReturnType<typeof getSessionSupabase>> };

async function requireCompanyAdmin(): Promise<Gate> {
  const supabase = await getSessionSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { response: NextResponse.json({ ok: false }, { status: 401 }) };
  const company = await getMyCompany(supabase).catch((err) => {
    console.error('review: company read failed', err);
    return null;
  });
  if (!company?.isAdmin) return { response: NextResponse.json({ ok: false }, { status: 403 }) };
  return { supabase };
}

export async function GET() {
  const gate = await requireCompanyAdmin();
  if (gate.response) return gate.response;
  const { supabase } = gate;

  const [docs, members] = await Promise.all([
    supabase.from('knowledge').select(`${KNOWLEDGE_COLUMNS}, user_id`)
      .order('created_at', { ascending: false })
      .returns<(Knowledge & { user_id: string })[]>(),
    supabase.rpc('company_member_emails'),
  ]);
  if (docs.error || members.error) {
    console.error('review read failed', docs.error ?? members.error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const memberRows = (members.data ?? []) as { user_id: string; email: string }[];
  const emails = new Map(memberRows.map((m) => [m.user_id, m.email]));
  const rows = docs.data.map(({ user_id, ...doc }) => ({ ...doc, owner: emails.get(user_id) ?? '' }));
  return NextResponse.json({ ok: true, rows });
}

export async function POST(request: Request) {
  const gate = await requireCompanyAdmin();
  if (gate.response) return gate.response;
  const { supabase } = gate;

  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ ok: false }, { status: 400 });

  const id = body.id;
  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) return NextResponse.json({ ok: false }, { status: 400 });
  const comment = parseText(body.comment, REVIEW_COMMENT_MAX);
  if (!comment.ok) return NextResponse.json({ ok: false, error: `Enter a comment of up to ${REVIEW_COMMENT_MAX} characters.` }, { status: 400 });

  const { data, error } = await supabase.from('knowledge')
    .update({ status: 'approved', review_comment: comment.value })
    .eq('id', id)
    .eq('status', 'pending_review')
    .select(KNOWLEDGE_COLUMNS)
    .maybeSingle();
  if (error) {
    console.error('knowledge approve failed', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  if (!data) return NextResponse.json({ ok: false, error: 'This document was already reviewed or is not in your company.' }, { status: 409 });
  return NextResponse.json({ ok: true, row: data });
}
