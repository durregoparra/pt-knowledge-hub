import 'server-only';
import type { User } from '@supabase/supabase-js';
import { getServerSupabase } from '@/lib/supabase-server';

// Reads a whole table with the secret key (no RLS). Only the admin API routes may call
// this, and only after requireAdmin() has passed.
export async function fetchAllRows<T>(table: string, columns: string): Promise<T[]> {
  const sb = getServerSupabase();
  const PAGE = 1000, rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb.from(table).select(columns)
      .order('created_at', { ascending: false }).range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data as T[]));
    if (data.length < PAGE) return rows;
  }
}

// Every account. Same rules as fetchAllRows: admin routes only.
export async function fetchUsers(): Promise<User[]> {
  const sb = getServerSupabase();
  const PER_PAGE = 1000, users: User[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < PER_PAGE) return users;
  }
}

// Email of every account, by user id.
export async function fetchUserEmails(): Promise<Map<string, string>> {
  return new Map((await fetchUsers()).map((u) => [u.id, u.email ?? '']));
}

export type Membership = { companyName: string; isAdmin: boolean };

// Each user's company and role, by user id. Users without a membership are absent.
export async function fetchMemberships(): Promise<Map<string, Membership>> {
  const sb = getServerSupabase();
  const PAGE = 1000, memberships = new Map<string, Membership>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb.from('company_members')
      .select('user_id, is_admin, companies(company_name)')
      .order('user_id').range(from, from + PAGE - 1)
      .returns<{ user_id: string; is_admin: boolean; companies: { company_name: string } | null }[]>();
    if (error) throw error;
    data.forEach((m) => memberships.set(m.user_id, { companyName: m.companies?.company_name ?? '', isAdmin: m.is_admin }));
    if (data.length < PAGE) return memberships;
  }
}
