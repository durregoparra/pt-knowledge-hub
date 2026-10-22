'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { COMPANY_MESSAGES, COMPANY_NAME_MAX, membershipMessage, type CompanyMembership } from '@/lib/company';

type Props = { mode: 'login' | 'register'; next: string };

const COPY = {
  login: { endpoint: '/api/auth/login', button: 'Sign in', pending: 'Signing in…' },
  register: { endpoint: '/api/auth/register', button: 'Create account', pending: 'Creating your account…' },
};

// Result of asking the server whether the typed company exists, for the name it was asked about.
type CompanyCheck = { name: string; state: 'checking' | 'new' | 'existing' | 'error' };

const normalizeInput = (value: string) => value.trim().replace(/\s+/g, ' ');

// Email + password form shared by /login and /register. Posts to our API routes, which
// set the session cookies; the browser never talks to Supabase.
export default function AuthForm({ mode, next }: Props) {
  const copy = COPY[mode];
  const [status, setStatus] = useState<{ message: string; kind?: 'ok' | 'error' }>({ message: '' });
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [companyInput, setCompanyInput] = useState('');
  const [companyCheck, setCompanyCheck] = useState<CompanyCheck | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const latestCheck = useRef('');

  // Ask /api/companies/check, which only says whether the name exists. Ignores stale answers.
  async function checkCompany(raw: string): Promise<CompanyCheck | null> {
    const name = normalizeInput(raw);
    latestCheck.current = name;
    if (!name) { setCompanyCheck(null); return null; }
    setCompanyCheck({ name, state: 'checking' });
    let result: CompanyCheck = { name, state: 'error' };
    try {
      const res = await fetch('/api/companies/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const body: { ok?: boolean; exists?: boolean } = await res.json();
      if (body.ok) result = { name, state: body.exists ? 'existing' : 'new' };
    } catch (err) {
      console.error(err);
    }
    if (latestCheck.current === name) setCompanyCheck(result);
    return result;
  }

  useEffect(() => {
    if (mode !== 'register') return;
    const timer = setTimeout(() => { void checkCompany(companyInput); }, 400);
    return () => clearTimeout(timer);
  }, [mode, companyInput]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const data = new FormData(form);

    setPending(true);
    // Make sure the company message for the submitted name is on screen before signing up.
    if (mode === 'register') {
      const name = normalizeInput(companyInput);
      if (companyCheck?.name !== name || companyCheck.state === 'checking' || companyCheck.state === 'error') {
        await checkCompany(name);
      }
    }
    setStatus({ message: copy.pending });
    let result: { ok?: boolean; error?: string; confirm?: boolean; company?: CompanyMembership | null } = {};
    try {
      const res = await fetch(copy.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'register'
          ? { email: data.get('email'), password: data.get('password'), company: data.get('company') }
          : { email: data.get('email'), password: data.get('password') }),
      });
      result = await res.json();
    } catch (err) {
      console.error(err);
    }

    if (result.ok && !result.confirm) {
      if (result.company) {
        // Confirm what the server decided, then let them continue.
        setDone(true);
        setStatus({ message: `Your account is ready. ${membershipMessage(result.company, true)}`, kind: 'ok' });
        return;
      }
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

  const companyMessage = companyCheck && companyCheck.name === normalizeInput(companyInput)
    ? { checking: 'Checking…', new: COMPANY_MESSAGES.new, existing: COMPANY_MESSAGES.existing, error: '' }[companyCheck.state]
    : '';

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
      {mode === 'register' && (
        <div className="form__field">
          <label className="form__label" htmlFor="register-company">Company</label>
          <input
            className="form__input"
            id="register-company"
            name="company"
            type="text"
            autoComplete="organization"
            maxLength={COMPANY_NAME_MAX}
            required
            value={companyInput}
            onChange={(e) => setCompanyInput(e.target.value)}
            aria-describedby="register-company-status"
          />
          <p className="form__status" id="register-company-status" aria-live="polite">{companyMessage}</p>
        </div>
      )}
      {done
        ? <a className="btn btn--primary" href={next}>Continue</a>
        : <button className="btn btn--primary" type="submit" disabled={pending}>{copy.button}</button>}
      <p className={'form__status' + (status.kind ? ' is-' + status.kind : '')} role="status" aria-live="polite">{status.message}</p>
    </form>
  );
}
