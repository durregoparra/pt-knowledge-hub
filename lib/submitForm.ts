'use client';

import { useState, type FormEvent } from 'react';

type Status = { message: string; kind?: 'ok' | 'error' };

// Shared submit behaviour for the landing forms: posts the fields to one of our API routes.
export function useSubmitForm(
  endpoint: string,
  toBody: (data: FormData) => Record<string, unknown>,
  successMsg: string
) {
  const [status, setStatus] = useState<Status>({ message: '' });
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    if (data.get('website')) return; // honeypot: bots only
    if (!form.checkValidity()) { form.reportValidity(); return; }

    setPending(true);
    setStatus({ message: 'Sending…' });
    let ok = false;
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toBody(data)),
      });
      ok = res.ok;
    } catch (err) {
      console.error(err);
    }
    setPending(false);

    if (!ok) {
      setStatus({ message: 'Something went wrong. Please try again.', kind: 'error' });
      return;
    }
    form.reset();
    setStatus({ message: successMsg, kind: 'ok' });
  }

  const statusClass = 'form__status' + (status.kind ? ' is-' + status.kind : '');
  return { onSubmit, pending, statusMessage: status.message, statusClass };
}
