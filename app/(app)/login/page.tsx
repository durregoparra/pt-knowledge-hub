import { redirect } from 'next/navigation';
import AppBar from '@/components/AppBar';
import AuthForm from '@/components/AuthForm';
import { safeNext } from '@/lib/paths';
import { getSessionUser } from '@/lib/supabase-session';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next: rawNext } = await searchParams;
  const next = safeNext(typeof rawNext === 'string' ? rawNext : null);
  if (await getSessionUser()) redirect(next);

  return (
    <>
      <AppBar />
      <main className="container pad-x admin__main">
        <section id="login" className="admin__login">
          <h1 className="h3">Sign in</h1>
          <p className="admin__muted">
            New here? <a href={`/register?next=${encodeURIComponent(next)}`}>Create an account</a>
          </p>
          <AuthForm mode="login" next={next} />
        </section>
      </main>
    </>
  );
}
