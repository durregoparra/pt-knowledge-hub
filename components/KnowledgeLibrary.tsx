'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { KNOWLEDGE_TYPES, NAME_MAX, PATH_MAX, SOURCE_TYPES, STATUSES, type Knowledge } from '@/lib/knowledge';
import { DESCRIPTION_MAX, type KnowledgeConflict, type KnowledgeVersion } from '@/lib/knowledge-versions';

type Loaded<T> = { state: 'loading' } | { state: 'error' } | { state: 'ok'; rows: T[] };
type Status = { message: string; kind?: 'ok' | 'error' };
// The pop-up shown when the document already exists. `step` 'ask' offers to replace it,
// 'describe' asks what changes, 'denied' tells a non-owner to contact the administrator.
type Replace = { conflict: KnowledgeConflict; name: string; path: string; form: HTMLFormElement; step: 'ask' | 'describe' | 'denied'; message: string };

const fmtDate = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

async function fetchRows<T>(endpoint: string): Promise<T[]> {
  const res = await fetch(endpoint, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${endpoint} responded ${res.status}`);
  const body: { rows: T[] } = await res.json();
  return body.rows;
}

// The signed-in user's documents: a form to register one, the list of their own and the
// earlier versions of those. All go through API routes that query Supabase on the server.
export default function KnowledgeLibrary() {
  const [docs, setDocs] = useState<Loaded<Knowledge>>({ state: 'loading' });
  const [versions, setVersions] = useState<Loaded<KnowledgeVersion>>({ state: 'loading' });
  const [status, setStatus] = useState<Status>({ message: '' });
  const [pending, setPending] = useState(false);
  const [replace, setReplace] = useState<Replace | null>(null);
  const [replaceStatus, setReplaceStatus] = useState<Status>({ message: '' });
  const dialogRef = useRef<HTMLDialogElement>(null);

  const loadVersions = useCallback(() => fetchRows<KnowledgeVersion>('/api/knowledge-versions')
    .then((rows) => setVersions({ state: 'ok', rows }))
    .catch((err) => { console.error(err); setVersions({ state: 'error' }); }), []);

  useEffect(() => {
    let current = true;
    fetchRows<Knowledge>('/api/knowledge')
      .then((rows) => { if (current) setDocs({ state: 'ok', rows }); })
      .catch((err) => { console.error(err); if (current) setDocs({ state: 'error' }); });
    loadVersions();
    return () => { current = false; };
  }, [loadVersions]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (replace && dialog && !dialog.open) dialog.showModal();
    if (!replace && dialog?.open) dialog.close();
  }, [replace]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const data = new FormData(form);

    setPending(true);
    setStatus({ message: 'Saving…' });
    let result: { ok?: boolean; error?: string; row?: Knowledge; conflict?: KnowledgeConflict } = {};
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
    if (result.conflict) {
      const { conflict } = result;
      setStatus({ message: '' });
      setReplaceStatus({ message: '' });
      setReplace({
        conflict, form,
        name: String(data.get('name')).trim(),
        path: String(data.get('path')),
        step: conflict.owner || conflict.admin ? 'ask' : 'denied',
        message: result.error ?? '',
      });
      return;
    }
    setStatus({ message: result.error ?? 'Something went wrong. Please try again.', kind: 'error' });
  }

  async function onReplace(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!replace) return;
    const form = e.currentTarget;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const { conflict } = replace;

    setPending(true);
    setReplaceStatus({ message: 'Saving…' });
    let result: { ok?: boolean; error?: string; row?: Knowledge; version?: number } = {};
    try {
      // The owner replaces through their session; the admin, for someone else's document,
      // through the admin route.
      const res = await fetch(conflict.owner ? '/api/knowledge' : '/api/admin/knowledge', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: conflict.id, path: replace.path, description: new FormData(form).get('description') }),
      });
      result = await res.json();
    } catch (err) {
      console.error(err);
    }
    setPending(false);

    if (result.ok && result.row) {
      const row = result.row;
      if (conflict.owner) {
        setDocs((prev) => (prev.state === 'ok' ? { state: 'ok', rows: [row, ...prev.rows.filter((r) => r.id !== row.id)] } : prev));
        loadVersions();
      }
      replace.form.reset();
      setReplace(null);
      setStatus({ message: `Document replaced. The previous one was saved as version ${result.version}. It is pending review.`, kind: 'ok' });
      return;
    }
    setReplaceStatus({ message: result.error ?? 'Something went wrong. Please try again.', kind: 'error' });
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

      <dialog className="admin__panel admin__dialog" ref={dialogRef} onClose={() => setReplace(null)} aria-labelledby="replace-title">
        {replace && (
          <>
            <div className="admin__panel-head">
              <h2 className="h4" id="replace-title">{replace.step === 'denied' ? 'You cannot replace this document' : 'This document already exists'}</h2>
            </div>
            {replace.step === 'denied' && (
              <>
                <p className="admin__panel-body admin__dialog-text">{replace.message}</p>
                <div className="admin__dialog-actions">
                  <button className="btn btn--primary" type="button" onClick={() => setReplace(null)}>Close</button>
                </div>
              </>
            )}
            {replace.step === 'ask' && (
              <>
                <p className="admin__panel-body admin__dialog-text">
                  A document named “{replace.name}” with this knowledge type and source type is already registered
                  {replace.conflict.owner ? '' : ' by another user'}. Do you want to replace it and create a new version?
                </p>
                <div className="admin__dialog-actions">
                  <button className="btn btn--primary" type="button" onClick={() => setReplace({ ...replace, step: 'describe' })}>Yes, replace it</button>
                  <button className="btn btn--outline" type="button" onClick={() => setReplace(null)}>Cancel</button>
                </div>
              </>
            )}
            {replace.step === 'describe' && (
              <form className="form" noValidate onSubmit={onReplace}>
                <div className="form__field">
                  <label className="form__label" htmlFor="replace-description">What changes in this version?</label>
                  <textarea className="form__input" id="replace-description" name="description" rows={4} maxLength={DESCRIPTION_MAX} required autoFocus></textarea>
                </div>
                <div className="admin__dialog-actions">
                  <button className="btn btn--primary" type="submit" disabled={pending}>Accept</button>
                  <button className="btn btn--outline" type="button" onClick={() => setReplace(null)}>Cancel</button>
                </div>
                <p className={'form__status' + (replaceStatus.kind ? ' is-' + replaceStatus.kind : '')} role="status" aria-live="polite">{replaceStatus.message}</p>
              </form>
            )}
          </>
        )}
      </dialog>

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
              <table className="admin__table">
                <thead><tr><th>Name</th><th>Path</th><th>Type</th><th>Source</th><th>Status</th><th>Added</th></tr></thead>
                <tbody>
                  {docs.rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.name}</td>
                      <td>{r.path}</td>
                      <td>{KNOWLEDGE_TYPES[r.knowledge_type]}</td>
                      <td>{SOURCE_TYPES[r.source_type]}</td>
                      <td>{STATUSES[r.status]}</td>
                      <td className="admin__date">{fmtDate(r.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="admin__panel">
        <div className="admin__panel-head">
          <h2 className="h4">Version history <span className="admin__count">{versions.state === 'loading' ? '…' : versions.state === 'ok' ? versions.rows.length : ''}</span></h2>
        </div>
        <div className="admin__panel-body">
          {versions.state === 'loading' && 'Loading…'}
          {versions.state === 'error' && 'Could not load the version history.'}
          {versions.state === 'ok' && versions.rows.length === 0 && 'None of your documents has been replaced yet.'}
          {versions.state === 'ok' && versions.rows.length > 0 && (
            <div className="admin__table-wrap">
              <table className="admin__table">
                <thead><tr><th>Name</th><th>Version</th><th>Path</th><th>Type</th><th>Source</th><th>What changed</th><th>Added</th><th>Replaced</th></tr></thead>
                <tbody>
                  {versions.rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.document_name}</td>
                      <td>{r.version_number}</td>
                      <td>{r.path}</td>
                      <td>{KNOWLEDGE_TYPES[r.knowledge_type]}</td>
                      <td>{SOURCE_TYPES[r.source_type]}</td>
                      <td>{r.description}</td>
                      <td className="admin__date">{fmtDate(r.created_at)}</td>
                      <td className="admin__date">{fmtDate(r.replaced_at)}</td>
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
