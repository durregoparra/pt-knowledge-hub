'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { KNOWLEDGE_TYPES, NAME_MAX, PATH_MAX, SOURCE_TYPES, STATUSES, type Knowledge } from '@/lib/knowledge';

type Loaded = { state: 'loading' } | { state: 'error' } | { state: 'ok'; rows: Knowledge[] };

const fmtDate = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

// The signed-in user's documents: a form to register one and the list of their own.
// Both go through /api/knowledge, which queries Supabase on the server with the session.
export default function KnowledgeLibrary() {
  const [docs, setDocs] = useState<Loaded>({ state: 'loading' });
  const [status, setStatus] = useState<{ message: string; kind?: 'ok' | 'error' }>({ message: '' });
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let current = true;
    fetch('/api/knowledge', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`/api/knowledge responded ${res.status}`);
        return res.json() as Promise<{ rows: Knowledge[] }>;
      })
      .then((body) => { if (current) setDocs({ state: 'ok', rows: body.rows }); })
      .catch((err) => { console.error(err); if (current) setDocs({ state: 'error' }); });
    return () => { current = false; };
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const data = new FormData(form);

    setPending(true);
    setStatus({ message: 'Saving…' });
    let result: { ok?: boolean; error?: string; row?: Knowledge } = {};
    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.get('name'),
          path: data.get('path'),
          knowledge_type: data.get('knowledge_type'),
          source_type: data.get('source_type'),
        }),
      });
      result = await res.json();
    } catch (err) {
      console.error(err);
    }
    setPending(false);

    if (result.ok && result.row) {
      const row = result.row;
      setDocs((prev) => (prev.state === 'ok' ? { state: 'ok', rows: [row, ...prev.rows] } : prev));
      form.reset();
      setStatus({ message: 'Document registered. It is pending review.', kind: 'ok' });
      return;
    }
    setStatus({ message: result.error ?? 'Something went wrong. Please try again.', kind: 'error' });
  }

  return (
    <>
      <section className="admin__panel">
        <div className="admin__panel-head">
          <h2 className="h4">Register a document</h2>
        </div>
        <form className="form" id="knowledge-form" noValidate onSubmit={onSubmit}>
          <div className="form__field">
            <label className="form__label" htmlFor="knowledge-name">Document name</label>
            <input className="form__input" id="knowledge-name" name="name" type="text" maxLength={NAME_MAX} required />
          </div>
          <div className="form__field">
            <label className="form__label" htmlFor="knowledge-path">Path <span>(link or folder where it lives)</span></label>
            <input className="form__input" id="knowledge-path" name="path" type="text" maxLength={PATH_MAX} required />
          </div>
          <div className="form__field">
            <label className="form__label" htmlFor="knowledge-type">Knowledge type</label>
            <select className="form__input" id="knowledge-type" name="knowledge_type" required defaultValue="">
              <option value="" disabled>Choose one</option>
              {Object.entries(KNOWLEDGE_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="form__field">
            <label className="form__label" htmlFor="knowledge-source">Source type</label>
            <select className="form__input" id="knowledge-source" name="source_type" required defaultValue="">
              <option value="" disabled>Choose one</option>
              {Object.entries(SOURCE_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <button className="btn btn--primary" type="submit" disabled={pending}>Register document</button>
          <p className={'form__status' + (status.kind ? ' is-' + status.kind : '')} role="status" aria-live="polite">{status.message}</p>
        </form>
      </section>

      <section className="admin__panel">
        <div className="admin__panel-head">
          <h2 className="h4">My documents <span className="admin__count">{docs.state === 'loading' ? '…' : docs.state === 'ok' ? docs.rows.length : ''}</span></h2>
        </div>
        <div className="admin__panel-body">
          {docs.state === 'loading' && 'Loading…'}
          {docs.state === 'error' && 'Could not load your documents.'}
          {docs.state === 'ok' && docs.rows.length === 0 && 'You have not registered any documents yet.'}
          {docs.state === 'ok' && docs.rows.length > 0 && (
            <div className="admin__table-wrap">
              <table className="admin__table admin__table--stack">
                <thead><tr><th>Name</th><th>Path</th><th>Type</th><th>Source</th><th>Status</th><th>Review comment</th><th>Added</th></tr></thead>
                <tbody>
                  {docs.rows.map((r) => (
                    <tr key={r.id}>
                      <td data-label="Name">{r.name}</td>
                      <td className="admin__cell--wrap" data-label="Path">{r.path}</td>
                      <td data-label="Type">{KNOWLEDGE_TYPES[r.knowledge_type]}</td>
                      <td data-label="Source">{SOURCE_TYPES[r.source_type]}</td>
                      <td data-label="Status">{STATUSES[r.status]}</td>
                      <td className="admin__cell--wide" data-label="Review comment"><span className="admin__note">{r.review_comment ?? '—'}</span></td>
                      <td className="admin__date" data-label="Added">{fmtDate(r.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
