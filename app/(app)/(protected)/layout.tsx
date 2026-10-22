import { redirect } from 'next/navigation';
import AppBar from '@/components/AppBar';
import { getSessionUser } from '@/lib/supabase-session';
import { recordVisit } from '@/lib/visits';

// Every page under (protected) needs a session. proxy.ts redirects early for the paths it
// lists; this check is the one that counts, and covers any page added here later.
// It also records today's visit, which the Return metric in /admin/metricas counts.
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  await recordVisit(user.id);

  return (
    <>
      <AppBar email={user.email} />
      {children}
    </>
  );
}
