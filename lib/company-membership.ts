import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CompanyMembership } from '@/lib/company';

// The signed-in user's company and role. Pass the session client: RLS limits both tables to
// the user's own membership and company. Null when the account has no company (accounts
// created before companies existed).
export async function getMyCompany(supabase: SupabaseClient): Promise<CompanyMembership | null> {
  const { data, error } = await supabase
    .from('company_members')
    .select('is_admin, companies(company_name)')
    .maybeSingle<{ is_admin: boolean; companies: { company_name: string } | null }>();
  if (error) throw error;
  if (!data?.companies) return null;
  return { companyName: data.companies.company_name, isAdmin: data.is_admin };
}
