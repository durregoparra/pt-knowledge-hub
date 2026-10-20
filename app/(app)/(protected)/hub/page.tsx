import KnowledgeLibrary from '@/components/KnowledgeLibrary';
import { isAdminEmail } from '@/lib/admin';
import { getSessionUser } from '@/lib/supabase-session';

// Home for signed-in users: register knowledge documents and see your own.
export default async function HubPage() {
  const user = await getSessionUser();

  return (
    <main className="container pad-x admin__main">
      <section className="admin__panel">
        <div className="admin__panel-head">
          <h1 className="h4">Welcome to the Knowledge Hub</h1>
        </div>
        <div className="admin__panel-body">
          <p>Register the documents Maria should learn from. Each one starts as pending review.</p>
          {isAdminEmail(user?.email) && <p><a href="/admin">Go to the admin panel</a></p>}
        </div>
      </section>
      <KnowledgeLibrary />
    </main>
  );
}
