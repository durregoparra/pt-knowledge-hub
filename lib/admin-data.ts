import 'server-only';
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

// Email of every account, by user id. Same rules as fetchAllRows: admin routes only.
export async function fetchUserEmails(): Promise<Map<string, string>> {
  const sb = getServerSupabase();
  const PER_PAGE = 1000, emails = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error) throw error;
    data.users.forEach((u) => emails.set(u.id, u.email ?? ''));
    if (data.users.length < PER_PAGE) return emails;
  }
}
