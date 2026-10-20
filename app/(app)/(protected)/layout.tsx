import { redirect } from 'next/navigation';
import AppBar from '@/components/AppBar';
import { getSessionUser } from '@/lib/supabase-session';

// Every page under (protected) needs a session. proxy.ts redirects early for the paths it
// lists; this check is the one that counts, and covers any page added here later.
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  return (
    <>
      <AppBar email={user.email} />
      {children}
    </>
  );
}
