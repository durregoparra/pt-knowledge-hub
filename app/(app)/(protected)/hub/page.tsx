import { isAdminEmail } from '@/lib/admin';
import { getSessionUser } from '@/lib/supabase-session';

// Placeholder home for signed-in users until the knowledge pages exist.
export default async function HubPage() {
  const user = await getSessionUser();

  return (
    <main className="container pad-x admin__main">
      <section className="admin__panel">
        <div className="admin__panel-head">
          <h1 className="h4">Welcome to the Knowledge Hub</h1>
        </div>
        <div className="admin__panel-body">
          <p>You are signed in. The knowledge library is not available yet.</p>
          {isAdminEmail(user?.email) && <p><a href="/admin">Go to the admin panel</a></p>}
        </div>
      </section>
    </main>
  );
}
