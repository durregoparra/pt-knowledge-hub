'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { getBrowserSupabase } from '@/lib/supabase-browser';

type User = { id: string; email: string };
type Signup = { email: string; created_at: string };
type Feedback = { message: string; email: string | null; created_at: string };
type Loaded<T> = { state: 'loading' } | { state: 'error' } | { state: 'ok'; rows: T[] };

const fmtDate = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

async function fetchAll<T>(table: string, columns: string): Promise<T[]> {
  const sb = getBrowserSupabase();
  const PAGE = 1000, rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb.from(table).select(columns)
      .order('created_at', { ascending: false }).range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data as T[]));
    if (data.length < PAGE) return rows;
  }
}

// ---------- CSV ----------
function csvCell(value: unknown) {
  let v = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; // block spreadsheet formulas
  return '"' + v.replace(/"/g, '""') + '"';
}

function downloadSignupsCsv(signups: Signup[]) {
  if (!signups.length) return;
  const lines = [['email', 'created_at'], ...signups.map((r) => [r.email, r.created_at])]
    .map((row) => row.map(csvCell).join(','));
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `signups-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const count = (data: Loaded<unknown>) => (data.state === 'loading' ? '…' : data.state === 'ok' ? data.rows.length : '');

export default function AdminPage() {
  // undefined = session not known yet (nothing shown), null = signed out
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [signups, setSignups] = useState<Loaded<Signup>>({ state: 'loading' });
  const [feedback, setFeedback] = useState<Loaded<Feedback>>({ state: 'loading' });
  const [loginStatus, setLoginStatus] = useState<{ message: string; error?: boolean }>({ message: '' });
  const [signingIn, setSigningIn] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  // ---------- auth ----------
  useEffect(() => {
    const { data } = getBrowserSupabase().auth.onAuthStateChange((_event, session) => {
      // Defer so Supabase calls don't run inside the auth callback.
      setTimeout(() => {
        // Keep the same object on token refresh etc. so the dashboard isn't reloaded.
        setUser((prev) => {
          if (!session) return null;
          if (prev && prev.id === session.user.id) return prev;
          return { id: session.user.id, email: session.user.email ?? '' };
        });
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // ---------- data ----------
  const userId = user?.id;
  useEffect(() => {
    setSignups({ state: 'loading' });
    setFeedback({ state: 'loading' });
    if (!userId) return;
    let current = true;
    fetchAll<Signup>('signups', 'email, created_at')
      .then((rows) => { if (current) setSignups({ state: 'ok', rows }); })
      .catch((err) => { console.error(err); if (current) setSignups({ state: 'error' }); });
    fetchAll<Feedback>('feedback', 'message, email, created_at')
      .then((rows) => { if (current) setFeedback({ state: 'ok', rows }); })
      .catch((err) => { console.error(err); if (current) setFeedback({ state: 'error' }); });
    return () => { current = false; };
  }, [userId]);

  async function onLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const data = new FormData(form);
    setSigningIn(true);
    setLoginStatus({ message: 'Signing in…' });
    const { error } = await getBrowserSupabase().auth.signInWithPassword({
      email: String(data.get('email')).trim(),
      password: String(data.get('password')),
    });
    setSigningIn(false);
    if (passwordRef.current) passwordRef.current.value = '';
    if (error) {
      setLoginStatus({ message: 'Invalid email or password.', error: true });
      return;
    }
    setLoginStatus({ message: '' });
  }

  const signupRows = signups.state === 'ok' ? signups.rows : [];

  return (
    <>
      <header className="admin__bar">
        <div className="container pad-x admin__bar-inner">
          <span className="nav__logo">
            <span className="mark" aria-hidden="true"></span>
            <span>Paraíso Tropical<small>Knowledge Hub · Admin</small></span>
          </span>
          <div className="admin__user" id="user-box" hidden={!user}>
            <span id="user-email">{user?.email}</span>
            <button className="btn btn--outline" id="sign-out" type="button" onClick={() => getBrowserSupabase().auth.signOut()}>Sign out</button>
          </div>
        </div>
      </header>

      <main className="container pad-x admin__main">
        {/* Shown when signed out */}
        <section id="login" className="admin__login" hidden={user !== null}>
          <h1 className="h3">Sign in</h1>
          <p className="admin__muted">Admin access only.</p>
          <form className="form" id="login-form" noValidate onSubmit={onLogin}>
            <div className="form__field">
              <label className="form__label" htmlFor="login-email">Email</label>
              <input className="form__input" id="login-email" name="email" type="email" autoComplete="username" required />
            </div>
            <div className="form__field">
              <label className="form__label" htmlFor="login-password">Password</label>
              <input className="form__input" id="login-password" name="password" type="password" autoComplete="current-password" required ref={passwordRef} />
            </div>
            <button className="btn btn--primary" type="submit" disabled={signingIn}>Sign in</button>
            <p className={loginStatus.error ? 'form__status is-error' : 'form__status'} role="status" aria-live="polite">{loginStatus.message}</p>
          </form>
        </section>

        {/* Filled only while signed in; emptied on sign-out */}
        <div id="dashboard" hidden={!user}>
          {user && (
            <>
              <section className="admin__panel">
                <div className="admin__panel-head">
                  <h2 className="h4">Signups <span className="admin__count">{count(signups)}</span></h2>
                  <button className="btn btn--red" type="button" disabled={signupRows.length === 0} onClick={() => downloadSignupsCsv(signupRows)}>Download CSV</button>
                </div>
                <div className="admin__panel-body">
                  {signups.state === 'loading' && 'Loading…'}
                  {signups.state === 'error' && 'Could not load signups.'}
                  {signups.state === 'ok' && signups.rows.length === 0 && 'No signups yet.'}
                  {signups.state === 'ok' && signups.rows.length > 0 && (
                    <div className="admin__table-wrap">
                      <table className="admin__table">
                        <thead><tr><th>Email</th><th>Signed up</th></tr></thead>
                        <tbody>
                          {signups.rows.map((r, i) => (
                            <tr key={i}><td>{r.email}</td><td className="admin__date">{fmtDate(r.created_at)}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>

              <section className="admin__panel">
                <div className="admin__panel-head">
                  <h2 className="h4">Feedback <span className="admin__count">{count(feedback)}</span></h2>
                </div>
                <div className="admin__panel-body">
                  {feedback.state === 'loading' && 'Loading…'}
                  {feedback.state === 'error' && 'Could not load feedback.'}
                  {feedback.state === 'ok' && feedback.rows.length === 0 && 'No feedback yet.'}
                  {feedback.state === 'ok' && feedback.rows.length > 0 && (
                    <ul className="admin__fb-list">
                      {feedback.rows.map((r, i) => (
                        <li className="admin__fb" key={i}>
                          <p className="admin__fb-msg">{r.message}</p>
                          <div className="admin__fb-meta">
                            <span>{r.email || 'Anonymous'}</span>
                            <span className="admin__date">{fmtDate(r.created_at)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </>
  );
}
