import { redirect } from 'next/navigation';
import AdminDashboard from '@/components/AdminDashboard';
import AppBar from '@/components/AppBar';
import { isAdminEmail } from '@/lib/admin';
import { APP_HOME } from '@/lib/paths';
import { getSessionUser } from '@/lib/supabase-session';

// The admin panel is only for the emails in ADMIN_EMAILS. A session alone is not enough,
// and the data routes under /api/admin repeat this check.
export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login?next=/admin');

  const isAdmin = isAdminEmail(user.email);

  return (
    <>
      <AppBar label="Knowledge Hub · Admin" email={user.email} />
      <main className="container pad-x admin__main">
        {isAdmin ? (
          <AdminDashboard />
        ) : (
          <section className="admin__login">
            <h1 className="h3">Admin access only</h1>
            <p className="admin__muted">Your account does not have access to the admin panel.</p>
            <p><a href={APP_HOME}>Back to the Knowledge Hub</a></p>
          </section>
        )}
      </main>
    </>
  );
}
