'use client';

import { useEffect, useState, type KeyboardEvent } from 'react';
import { KNOWLEDGE_TYPES, SOURCE_TYPES, STATUSES, type Knowledge } from '@/lib/knowledge';

type Feedback = { message: string; email: string | null; created_at: string };
type KnowledgeRow = Knowledge & { owner: string; company: string };
type Company = { company_id: number; company_name: string; admin_email: string; members: number };
type UserRow = { id: string; email: string; company: string; is_admin: boolean; created_at: string };
type Loaded<T> = { state: 'loading' } | { state: 'error' } | { state: 'ok'; rows: T[] };

const fmtDate = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

// The admin API routes check ADMIN_EMAILS and read with the secret key on the server.
async function fetchRows<T>(endpoint: string): Promise<T[]> {
  const res = await fetch(endpoint, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${endpoint} responded ${res.status}`);
  const body: { rows: T[] } = await res.json();
  return body.rows;
}

const count = (data: Loaded<unknown>) => (data.state === 'loading' ? '…' : data.state === 'ok' ? data.rows.length : '');

const TABS = [
  { key: 'knowledge', label: 'Knowledge' },
  { key: 'companies', label: 'Companies' },
  { key: 'users', label: 'Users' },
  { key: 'feedback', label: 'Feedback' },
] as const;
type Tab = (typeof TABS)[number]['key'];

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('knowledge');
  const [feedback, setFeedback] = useState<Loaded<Feedback>>({ state: 'loading' });
  const [knowledge, setKnowledge] = useState<Loaded<KnowledgeRow>>({ state: 'loading' });
  const [companies, setCompanies] = useState<Loaded<Company>>({ state: 'loading' });
  const [users, setUsers] = useState<Loaded<UserRow>>({ state: 'loading' });

  useEffect(() => {
    let current = true;
    fetchRows<Feedback>('/api/admin/feedback')
      .then((rows) => { if (current) setFeedback({ state: 'ok', rows }); })
      .catch((err) => { console.error(err); if (current) setFeedback({ state: 'error' }); });
    fetchRows<KnowledgeRow>('/api/admin/knowledge')
      .then((rows) => { if (current) setKnowledge({ state: 'ok', rows }); })
      .catch((err) => { console.error(err); if (current) setKnowledge({ state: 'error' }); });
    fetchRows<Company>('/api/admin/companies')
      .then((rows) => { if (current) setCompanies({ state: 'ok', rows }); })
      .catch((err) => { console.error(err); if (current) setCompanies({ state: 'error' }); });
    fetchRows<UserRow>('/api/admin/users')
      .then((rows) => { if (current) setUsers({ state: 'ok', rows }); })
      .catch((err) => { console.error(err); if (current) setUsers({ state: 'error' }); });
    return () => { current = false; };
  }, []);

  const counts: Record<Tab, Loaded<unknown>> = { knowledge, companies, users, feedback };

  // Arrow keys move between tabs, as in the WAI-ARIA tabs pattern.
  function onTabKey(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = TABS.findIndex((t) => t.key === tab);
    const nextTab = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length].key;
    setTab(nextTab);
    document.getElementById(`tab-${nextTab}`)?.focus();
  }

  return (
    <div id="dashboard">
      <div className="admin__tabs" role="tablist" aria-label="Admin sections">
        {TABS.map((t) => (
          <button
            key={t.key}
            id={`tab-${t.key}`}
            className="admin__tab"
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            aria-controls={`panel-${t.key}`}
            tabIndex={tab === t.key ? 0 : -1}
            onClick={() => setTab(t.key)}
            onKeyDown={onTabKey}
          >
            {t.label}<span className="admin__count">{count(counts[t.key])}</span>
          </button>
        ))}
      </div>

      {tab === 'knowledge' && (
        <section className="admin__panel" id="panel-knowledge" role="tabpanel" aria-labelledby="tab-knowledge">
          <div className="admin__panel-head">
            <h2 className="h4">Knowledge <span className="admin__count">{count(knowledge)}</span></h2>
          </div>
          <div className="admin__panel-body">
            {knowledge.state === 'loading' && 'Loading…'}
            {knowledge.state === 'error' && 'Could not load knowledge documents.'}
            {knowledge.state === 'ok' && knowledge.rows.length === 0 && 'No documents yet.'}
            {knowledge.state === 'ok' && knowledge.rows.length > 0 && (
              <div className="admin__table-wrap">
                <table className="admin__table">
                  <thead><tr><th>Name</th><th>Owner</th><th>Company</th><th>Type</th><th>Source</th><th>Status</th><th>Added</th></tr></thead>
                  <tbody>
                    {knowledge.rows.map((r) => (
                      <tr key={r.id}>
                        <td>{r.name}</td>
                        <td>{r.owner}</td>
                        <td>{r.company || '—'}</td>
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
      )}

      {tab === 'companies' && (
        <section className="admin__panel" id="panel-companies" role="tabpanel" aria-labelledby="tab-companies">
          <div className="admin__panel-head">
            <h2 className="h4">Companies <span className="admin__count">{count(companies)}</span></h2>
          </div>
          <div className="admin__panel-body">
            {companies.state === 'loading' && 'Loading…'}
            {companies.state === 'error' && 'Could not load companies.'}
            {companies.state === 'ok' && companies.rows.length === 0 && 'No companies yet.'}
            {companies.state === 'ok' && companies.rows.length > 0 && (
              <div className="admin__table-wrap">
                <table className="admin__table">
                  <thead><tr><th>Company</th><th>Administrator</th><th>Users</th></tr></thead>
                  <tbody>
                    {companies.rows.map((r) => (
                      <tr key={r.company_id}><td>{r.company_name}</td><td>{r.admin_email}</td><td>{r.members}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {tab === 'users' && (
        <section className="admin__panel" id="panel-users" role="tabpanel" aria-labelledby="tab-users">
          <div className="admin__panel-head">
            <h2 className="h4">Users <span className="admin__count">{count(users)}</span></h2>
          </div>
          <div className="admin__panel-body">
            {users.state === 'loading' && 'Loading…'}
            {users.state === 'error' && 'Could not load users.'}
            {users.state === 'ok' && users.rows.length === 0 && 'No users yet.'}
            {users.state === 'ok' && users.rows.length > 0 && (
              <div className="admin__table-wrap">
                <table className="admin__table">
                  <thead><tr><th>Email</th><th>Company</th><th>Role</th><th>Registered</th></tr></thead>
                  <tbody>
                    {users.rows.map((r) => (
                      <tr key={r.id}>
                        <td>{r.email}</td>
                        <td>{r.company || '—'}</td>
                        <td>{r.company ? (r.is_admin ? 'Company administrator' : 'User') : '—'}</td>
                        <td className="admin__date">{fmtDate(r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {tab === 'feedback' && (
        <section className="admin__panel" id="panel-feedback" role="tabpanel" aria-labelledby="tab-feedback">
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
      )}
    </div>
  );
}
