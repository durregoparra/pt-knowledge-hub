import { redirect } from 'next/navigation';
import AdminMetrics from '@/components/AdminMetrics';
import AppBar from '@/components/AppBar';
import { isAdminEmail } from '@/lib/admin';
import { APP_HOME } from '@/lib/paths';
import { getSessionUser } from '@/lib/supabase-session';

// Usage metrics, only for the emails in ADMIN_EMAILS. /api/admin/metrics repeats the check.
export default async function AdminMetricsPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login?next=/admin/metricas');

  const isAdmin = isAdminEmail(user.email);

  return (
    <>
      <AppBar label="Admin" email={user.email} />
      <main className="container pad-x admin__main">
        {isAdmin ? (
          <>
            <div className="admin__page-head">
              <h1 className="h3">Metrics</h1>
              <a href="/admin">Back to admin panel</a>
            </div>
            <AdminMetrics />
          </>
        ) : (
          <section className="admin__login">
            <h1 className="h3">Admin access only</h1>
            <p className="admin__muted">Your account does not have access to the admin panel.</p>
            <p><a href={APP_HOME}>Back to Knowledge Connect</a></p>
          </section>
        )}
      </main>
    </>
  );
}
