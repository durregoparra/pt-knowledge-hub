import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { fetchAllRows, fetchMemberships, fetchUsers } from '@/lib/admin-data';

const WEEKS = 12;
const DAY_MS = 86_400_000;

// Monday (UTC) of the week that contains the given date or ISO timestamp, as YYYY-MM-DD.
function weekStart(value: string): string {
  const d = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.toISOString().slice(0, 10);
}

const rate = (part: number, total: number) => (total ? part / total : 0);

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Everyday knowledge: operational guides, or anything that came from an email or a meeting.
const isEveryday = (k: { knowledge_type: string; source_type: string }) =>
  k.knowledge_type === 'operational_guide' || k.source_type === 'email' || k.source_type === 'meeting';

// Registered users, activation (users with at least one knowledge document), return (users
// who opened the app on two or more days), documents per company, the share of everyday
// knowledge and new/active users for the last weeks.
export async function GET() {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;

  try {
    const [users, allKnowledge, visits, memberships] = await Promise.all([
      fetchUsers(),
      fetchAllRows<{ user_id: string; knowledge_type: string; source_type: string }>('knowledge', 'user_id, knowledge_type, source_type'),
      fetchAllRows<{ user_id: string; visited_on: string }>('visits', 'user_id, visited_on'),
      fetchMemberships(),
    ]);
    const ids = new Set(users.map((u) => u.id));
    const knowledge = allKnowledge.filter((k) => ids.has(k.user_id));

    const activated = new Set(knowledge.map((k) => k.user_id)).size;

    // A document belongs to its owner's company; documents of users without a company are left out.
    const docsByCompany = new Map<string, number>();
    memberships.forEach((m) => docsByCompany.set(m.companyName, 0));
    knowledge.forEach((k) => {
      const company = memberships.get(k.user_id)?.companyName;
      if (company !== undefined) docsByCompany.set(company, docsByCompany.get(company)! + 1);
    });
    const companyDocs = [...docsByCompany.values()];

    const everyday = knowledge.filter(isEveryday).length;

    const daysByUser = new Map<string, number>();
    visits.forEach((v) => { if (ids.has(v.user_id)) daysByUser.set(v.user_id, (daysByUser.get(v.user_id) ?? 0) + 1); });
    const returning = [...daysByUser.values()].filter((days) => days >= 2).length;

    const current = new Date(`${weekStart(new Date().toISOString())}T00:00:00Z`).getTime();
    const weeks = Array.from({ length: WEEKS }, (_, i) => ({
      start: new Date(current - (WEEKS - 1 - i) * 7 * DAY_MS).toISOString().slice(0, 10),
      newUsers: 0,
      active: new Set<string>(),
    }));
    const byStart = new Map(weeks.map((w) => [w.start, w]));
    users.forEach((u) => { const w = byStart.get(weekStart(u.created_at)); if (w) w.newUsers++; });
    visits.forEach((v) => { if (ids.has(v.user_id)) byStart.get(weekStart(v.visited_on))?.active.add(v.user_id); });

    return NextResponse.json({
      ok: true,
      users: users.length,
      activated,
      activationRate: rate(activated, users.length),
      returning,
      returnRate: rate(returning, users.length),
      companies: companyDocs.length,
      companiesWithDocs: companyDocs.filter((n) => n > 0).length,
      medianDocsPerCompany: median(companyDocs),
      documents: knowledge.length,
      everyday,
      everydayRate: rate(everyday, knowledge.length),
      weeks: weeks.map((w) => ({ start: w.start, newUsers: w.newUsers, activeUsers: w.active.size })),
    });
  } catch (err) {
    console.error('admin metrics read failed', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
