'use client';

import { useSubmitForm } from '@/lib/submitForm';

export default function SignupForm() {
  const { onSubmit, pending, statusMessage, statusClass } = useSubmitForm(
    '/api/signups',
    (d) => ({ email: d.get('email') }),
    "Thanks! You're on the list."
  );

  return (
    <form className="form form--inline form--dark" id="signup-form" noValidate onSubmit={onSubmit}>
      <h3 className="form__title">Get early access</h3>
      <p className="form__hint">Join the waitlist and we&apos;ll let you know when Knowledge Connect opens to your team.</p>
      <div className="form__row">
        <label className="sr-only" htmlFor="signup-email">Email</label>
        <input className="form__input" id="signup-email" name="email" type="email" placeholder="you@company.com" autoComplete="email" maxLength={254} required />
        <input className="form__trap" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <button className="btn btn--red" type="submit" disabled={pending}>Join the waitlist</button>
      </div>
      <p className={statusClass} role="status" aria-live="polite">{statusMessage}</p>
    </form>
  );
}
