'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { KNOWLEDGE_TYPES, REVIEW_COMMENT_MAX, SOURCE_TYPES, STATUSES, type Knowledge } from '@/lib/knowledge';

type ReviewRow = Knowledge & { owner: string };
type Loaded = { state: 'loading' } | { state: 'error' } | { state: 'ok'; rows: ReviewRow[] };

const fmtDate = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

// The company's documents for its administrator, with an approve form on each pending one.
// Both go through /api/knowledge/review, which checks the role and queries with the session.
export default function KnowledgeReview() {
  const [docs, setDocs] = useState<Loaded>({ state: 'loading' });

  useEffect(() => {
    let current = true;
    fetch('/api/knowledge/review', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`/api/knowledge/review responded ${res.status}`);
        return res.json() as Promise<{ rows: ReviewRow[] }>;
      })
      .then((body) => { if (current) setDocs({ state: 'ok', rows: body.rows }); })
      .catch((err) => { console.error(err); if (current) setDocs({ state: 'error' }); });
    return () => { current = false; };
  }, []);

  function onApproved(row: Knowledge) {
    setDocs((prev) => (prev.state === 'ok'
      ? { state: 'ok', rows: prev.rows.map((r) => (r.id === row.id ? { ...r, ...row } : r)) }
      : prev));
  }

  const pendingCount = docs.state === 'ok' ? docs.rows.filter((r) => r.status === 'pending_review').length : 0;

  return (
    <section className="admin__panel">
      <div className="admin__panel-head">
        <h2 className="h4">Company documents <span className="admin__count">{docs.state === 'loading' ? '…' : docs.state === 'ok' ? docs.rows.length : ''}</span></h2>
      </div>
      <div className="admin__panel-body">
        {docs.state === 'loading' && 'Loading…'}
        {docs.state === 'error' && 'Could not load your company’s documents.'}
        {docs.state === 'ok' && docs.rows.length === 0 && 'Nobody in your company has registered documents yet.'}
        {docs.state === 'ok' && docs.rows.length > 0 && (
          <>
            <p>{pendingCount === 1 ? '1 document is' : `${pendingCount} documents are`} pending review.</p>
            <div className="admin__table-wrap">
              <table className="admin__table admin__table--stack">
                <thead><tr><th>Name</th><th>Owner</th><th>Path</th><th>Type</th><th>Source</th><th>Status</th><th>Added</th><th>Review</th></tr></thead>
                <tbody>
                  {docs.rows.map((r) => (
                    <tr key={r.id}>
                      <td data-label="Name">{r.name}</td>
                      <td className="admin__cell--wrap" data-label="Owner">{r.owner || '—'}</td>
                      <td className="admin__cell--wrap" data-label="Path">{r.path}</td>
                      <td data-label="Type">{KNOWLEDGE_TYPES[r.knowledge_type]}</td>
                      <td data-label="Source">{SOURCE_TYPES[r.source_type]}</td>
                      <td data-label="Status">{STATUSES[r.status]}</td>
                      <td className="admin__date" data-label="Added">{fmtDate(r.created_at)}</td>
                      <td className="admin__cell--wide" data-label="Review">
                        {r.status === 'pending_review'
                          ? <ApproveForm id={r.id} onApproved={onApproved} />
                          : <>
                              <span className="admin__note">{r.review_comment ?? '—'}</span>
                              {r.reviewed_at && <span className="admin__date">{fmtDate(r.reviewed_at)}</span>}
                            </>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function ApproveForm({ id, onApproved }: { id: number; onApproved: (row: Knowledge) => void }) {
  const [status, setStatus] = useState<{ message: string; kind?: 'ok' | 'error' }>({ message: '' });
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const data = new FormData(form);

    setPending(true);
    setStatus({ message: 'Saving…' });
    let result: { ok?: boolean; error?: string; row?: Knowledge } = {};
    try {
      const res = await fetch('/api/knowledge/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, comment: data.get('comment') }),
      });
      result = await res.json();
    } catch (err) {
      console.error(err);
    }
    setPending(false);

    if (result.ok && result.row) { onApproved(result.row); return; }
    setStatus({ message: result.error ?? 'Something went wrong. Please try again.', kind: 'error' });
  }

  return (
    <form className="form" noValidate onSubmit={onSubmit}>
      <div className="form__field">
        <label className="form__label" htmlFor={`review-comment-${id}`}>Comment</label>
        <textarea className="form__input" id={`review-comment-${id}`} name="comment" maxLength={REVIEW_COMMENT_MAX} required />
      </div>
      <button className="btn btn--primary" type="submit" disabled={pending}>Approve</button>
      <p className={'form__status' + (status.kind ? ' is-' + status.kind : '')} role="status" aria-live="polite">{status.message}</p>
    </form>
  );
}
