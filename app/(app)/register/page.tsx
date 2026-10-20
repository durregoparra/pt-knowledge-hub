import { redirect } from 'next/navigation';
import AppBar from '@/components/AppBar';
import AuthForm from '@/components/AuthForm';
import { safeNext } from '@/lib/paths';
import { getSessionUser } from '@/lib/supabase-session';

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next: rawNext } = await searchParams;
  const next = safeNext(typeof rawNext === 'string' ? rawNext : null);
  if (await getSessionUser()) redirect(next);

  return (
    <>
      <AppBar />
      <main className="container pad-x admin__main">
        <section id="register" className="admin__login">
          <h1 className="h3">Create your account</h1>
          <p className="admin__muted">
            Already have one? <a href={`/login?next=${encodeURIComponent(next)}`}>Sign in</a>
          </p>
          <AuthForm mode="register" next={next} />
        </section>
      </main>
    </>
  );
}
