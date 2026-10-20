'use client';

import { useRef, useState, type FormEvent } from 'react';

type Props = { mode: 'login' | 'register'; next: string };

const COPY = {
  login: { endpoint: '/api/auth/login', button: 'Sign in', pending: 'Signing in…' },
  register: { endpoint: '/api/auth/register', button: 'Create account', pending: 'Creating your account…' },
};

// Email + password form shared by /login and /register. Posts to our API routes, which
// set the session cookies; the browser never talks to Supabase.
export default function AuthForm({ mode, next }: Props) {
  const copy = COPY[mode];
  const [status, setStatus] = useState<{ message: string; kind?: 'ok' | 'error' }>({ message: '' });
  const [pending, setPending] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const data = new FormData(form);

    setPending(true);
    setStatus({ message: copy.pending });
    let result: { ok?: boolean; error?: string; confirm?: boolean } = {};
    try {
      const res = await fetch(copy.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.get('email'), password: data.get('password') }),
      });
      result = await res.json();
    } catch (err) {
      console.error(err);
    }

    if (result.ok && !result.confirm) {
      window.location.assign(next); // full navigation: the next page has its own root layout
      return;
    }
    setPending(false);
    if (passwordRef.current) passwordRef.current.value = '';
    if (result.ok) {
      setStatus({ message: 'Check your email to confirm your account, then sign in.', kind: 'ok' });
      return;
    }
    setStatus({ message: result.error ?? 'Something went wrong. Please try again.', kind: 'error' });
  }

  return (
    <form className="form" id={`${mode}-form`} noValidate onSubmit={onSubmit}>
      <div className="form__field">
        <label className="form__label" htmlFor={`${mode}-email`}>Email</label>
        <input className="form__input" id={`${mode}-email`} name="email" type="email" autoComplete="username" maxLength={254} required />
      </div>
      <div className="form__field">
        <label className="form__label" htmlFor={`${mode}-password`}>Password</label>
        <input
          className="form__input"
          id={`${mode}-password`}
          name="password"
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          minLength={mode === 'register' ? 8 : undefined}
          maxLength={72}
          required
          ref={passwordRef}
        />
      </div>
      <button className="btn btn--primary" type="submit" disabled={pending}>{copy.button}</button>
      <p className={'form__status' + (status.kind ? ' is-' + status.kind : '')} role="status" aria-live="polite">{status.message}</p>
    </form>
  );
}
