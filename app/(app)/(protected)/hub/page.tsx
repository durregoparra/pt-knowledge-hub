import KnowledgeLibrary from '@/components/KnowledgeLibrary';
import { isAdminEmail } from '@/lib/admin';
import { membershipMessage } from '@/lib/company';
import { getMyCompany } from '@/lib/company-membership';
import { getSessionSupabase, getSessionUser } from '@/lib/supabase-session';

// Home for signed-in users: register knowledge documents and see your own.
export default async function HubPage() {
  const user = await getSessionUser();
  const company = await getMyCompany(await getSessionSupabase()).catch((err) => {
    console.error('hub: company read failed', err);
    return null;
  });

  return (
    <main className="container pad-x admin__main">
      <section className="admin__panel">
        <div className="admin__panel-head">
          <h1 className="h4">Welcome to Knowledge Connect</h1>
        </div>
        <div className="admin__panel-body">
          {company && <p>{membershipMessage(company)}</p>}
          {company?.isAdmin && <p><a href="/hub/review">Review your company&rsquo;s documents</a></p>}
          <p>Register the documents Maria should learn from. Each one starts as pending review.</p>
          {isAdminEmail(user?.email) && <p><a href="/admin">Go to the admin panel</a></p>}
        </div>
      </section>
      <KnowledgeLibrary />
    </main>
  );
}
