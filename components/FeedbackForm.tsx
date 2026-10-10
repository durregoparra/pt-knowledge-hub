'use client';

import { useSubmitForm } from '@/lib/submitForm';

export default function FeedbackForm() {
  const { onSubmit, pending, statusMessage, statusClass } = useSubmitForm(
    '/api/feedback',
    (d) => ({ message: d.get('message'), email: d.get('email') }),
    'Thanks for your feedback!'
  );

  return (
    <form className="form reveal" id="feedback-form" noValidate onSubmit={onSubmit}>
      <div className="form__field">
        <label className="form__label" htmlFor="feedback-message">Your feedback</label>
        <textarea className="form__input" id="feedback-message" name="message" rows={5} maxLength={2000} required></textarea>
      </div>
      <div className="form__field">
        <label className="form__label" htmlFor="feedback-email">Email <span>(optional)</span></label>
        <input className="form__input" id="feedback-email" name="email" type="email" autoComplete="email" maxLength={254} placeholder="So we can reply" />
      </div>
      <input className="form__trap" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <button className="btn btn--primary" type="submit" disabled={pending}>Send feedback</button>
      <p className={statusClass} role="status" aria-live="polite">{statusMessage}</p>
    </form>
  );
}
