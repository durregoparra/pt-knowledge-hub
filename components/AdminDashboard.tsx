'use client';

import { useEffect, useState } from 'react';

type Signup = { email: string; created_at: string };
type Feedback = { message: string; email: string | null; created_at: string };
type Loaded<T> = { state: 'loading' } | { state: 'error' } | { state: 'ok'; rows: T[] };

const fmtDate = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

// The admin API routes check ADMIN_EMAILS and read with the secret key on the server.
async function fetchRows<T>(endpoint: string): Promise<T[]> {
  const res = await fetch(endpoint, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${endpoint} responded ${res.status}`);
  const body: { rows: T[] } = await res.json();
  return body.rows;
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

export default function AdminDashboard() {
  const [signups, setSignups] = useState<Loaded<Signup>>({ state: 'loading' });
  const [feedback, setFeedback] = useState<Loaded<Feedback>>({ state: 'loading' });

  useEffect(() => {
    let current = true;
    fetchRows<Signup>('/api/admin/signups')
      .then((rows) => { if (current) setSignups({ state: 'ok', rows }); })
      .catch((err) => { console.error(err); if (current) setSignups({ state: 'error' }); });
    fetchRows<Feedback>('/api/admin/feedback')
      .then((rows) => { if (current) setFeedback({ state: 'ok', rows }); })
      .catch((err) => { console.error(err); if (current) setFeedback({ state: 'error' }); });    return () => { current = false; };
  }, []);

  const signupRows = signups.state === 'ok' ? signups.rows : [];

  return (
    <div id="dashboard">
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
    </div>
  );
}
