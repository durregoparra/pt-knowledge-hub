'use client';

import { useEffect, useState } from 'react';

type Week = { start: string; newUsers: number; activeUsers: number };
type Metrics = {
  users: number;
  activated: number;
  activationRate: number;
  returning: number;
  returnRate: number;
  companies: number;
  companiesWithDocs: number;
  medianDocsPerCompany: number;
  documents: number;
  everyday: number;
  everydayRate: number;
  weeks: Week[];
};
type Loaded = { state: 'loading' } | { state: 'error' } | { state: 'ok'; data: Metrics };

const pct = (r: number) => `${Math.round(r * 100)}%`;
const fmtWeek = (start: string) =>
  new Date(`${start}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });

const SERIES = [
  { key: 'newUsers', label: 'New users', className: 'admin__chart-bar--new' },
  { key: 'activeUsers', label: 'Users who entered the app', className: 'admin__chart-bar--active' },
] as const;

// Smallest "nice" axis top (1, 2 or 5 × 10ⁿ steps, four of them) that fits the largest value.
function axisTicks(max: number): number[] {
  const raw = Math.max(max, 4) / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw)!;
  return [0, 1, 2, 3, 4].map((i) => i * step);
}

// Chart geometry, in viewBox units.
const W = 720, H = 260, LEFT = 36, RIGHT = 8, TOP = 12, BOTTOM = 28;
const PLOT_W = W - LEFT - RIGHT, PLOT_H = H - TOP - BOTTOM;
const BAR = 18, GAP = 2;

// Path for a column with a 4px rounded top and a square base.
function column(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, h, w / 2);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

function WeeklyChart({ weeks }: { weeks: Week[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const ticks = axisTicks(Math.max(...weeks.flatMap((w) => [w.newUsers, w.activeUsers])));
  const top = ticks[ticks.length - 1];
  const band = PLOT_W / weeks.length;
  const y = (v: number) => TOP + PLOT_H - (v / top) * PLOT_H;
  const hovered = hover === null ? null : weeks[hover];
  // Tooltip anchor as a fraction of the width; shifting it by the same fraction keeps it inside.
  const tipAt = hover === null ? 0 : (LEFT + band * hover + band / 2) / W;

  return (
    <div className="admin__chart">
      <ul className="admin__chart-legend">
        {SERIES.map((s) => (
          <li key={s.key}><span className={`admin__chart-key ${s.className}`} aria-hidden="true" />{s.label}</li>
        ))}
      </ul>
      <div className="admin__table-wrap">
        <div className="admin__chart-plot">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="New users and users who entered the app, per week">
            {ticks.map((t) => (
              <g key={t}>
                <line className="admin__chart-grid" x1={LEFT} x2={W - RIGHT} y1={y(t)} y2={y(t)} />
                <text className="admin__chart-tick" x={LEFT - 8} y={y(t)} dy="0.35em" textAnchor="end">{t}</text>
              </g>
            ))}
            {weeks.map((w, i) => {
              const cx = LEFT + band * i + band / 2;
              return (
                <g key={w.start}>
                  {SERIES.map((s, j) => {
                    const v = w[s.key];
                    const h = (v / top) * PLOT_H;
                    const x = cx - BAR - GAP / 2 + j * (BAR + GAP);
                    return v > 0 ? <path key={s.key} className={`admin__chart-bar ${s.className}`} d={column(x, y(v), BAR, h)} /> : null;
                  })}
                  <text className="admin__chart-tick" x={cx} y={H - 8} textAnchor="middle">{fmtWeek(w.start)}</text>
                  <rect
                    className="admin__chart-hit"
                    x={LEFT + band * i}
                    y={TOP}
                    width={band}
                    height={PLOT_H}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                  />
                </g>
              );
            })}
          </svg>
          {hovered && (
            <div
              className="admin__chart-tip"
              style={{ left: `${tipAt * 100}%`, transform: `translateX(-${tipAt * 100}%)` }}
              role="status"
            >
              <strong>Week of {fmtWeek(hovered.start)}</strong>
              {SERIES.map((s) => (
                <span key={s.key}><span className={`admin__chart-key ${s.className}`} aria-hidden="true" />{s.label}: {hovered[s.key]}</span>
              ))}
            </div>
          )}
        </div>
      </div>
      <details className="admin__chart-data">
        <summary>Show as table</summary>
        <div className="admin__table-wrap">
          <table className="admin__table">
            <thead><tr><th>Week of</th><th>New users</th><th>Users who entered the app</th></tr></thead>
            <tbody>
              {weeks.map((w) => (
                <tr key={w.start}><td>{fmtWeek(w.start)}</td><td>{w.newUsers}</td><td>{w.activeUsers}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

export default function AdminMetrics() {
  const [metrics, setMetrics] = useState<Loaded>({ state: 'loading' });

  // The admin API route checks ADMIN_EMAILS and reads with the secret key on the server.
  useEffect(() => {
    let current = true;
    fetch('/api/admin/metrics', { cache: 'no-store' })
      .then((res) => { if (!res.ok) throw new Error(`/api/admin/metrics responded ${res.status}`); return res.json(); })
      .then((data: Metrics) => { if (current) setMetrics({ state: 'ok', data }); })
      .catch((err) => { console.error(err); if (current) setMetrics({ state: 'error' }); });
    return () => { current = false; };
  }, []);

  if (metrics.state !== 'ok') {
    return (
      <section className="admin__panel">
        <div className="admin__panel-body">{metrics.state === 'loading' ? 'Loading…' : 'Could not load metrics.'}</div>
      </section>
    );
  }

  const m = metrics.data;
  const tiles = [
    { label: 'Registered users', value: String(m.users), note: 'Accounts on Knowledge Connect' },
    { label: 'Activation', value: pct(m.activationRate), note: `${m.activated} of ${m.users} users registered at least one knowledge document` },
    { label: 'Return', value: pct(m.returnRate), note: `${m.returning} of ${m.users} users entered the app on two or more days` },
    {
      label: 'Documents per company',
      value: String(Math.round(m.medianDocsPerCompany * 10) / 10),
      note: `Median across ${m.companies} ${m.companies === 1 ? 'company' : 'companies'}; ${m.companiesWithDocs} have at least one document`,
    },
    {
      label: 'Everyday knowledge',
      value: pct(m.everydayRate),
      note: `${m.everyday} of ${m.documents} documents are operational guides or come from email or meetings`,
    },
  ];

  return (
    <>
      <div className="admin__metrics">
        {tiles.map((t) => (
          <section className="admin__panel admin__metric" key={t.label}>
            <h2 className="admin__metric-label">{t.label}</h2>
            <p className="admin__metric-value">{t.value}</p>
            <p className="admin__metric-note">{t.note}</p>
          </section>
        ))}
      </div>
      <section className="admin__panel">
        <div className="admin__panel-head">
          <h2 className="h4">Per week</h2>
          <span className="admin__date">Last {m.weeks.length} weeks, starting Monday (UTC)</span>
        </div>
        <WeeklyChart weeks={m.weeks} />
      </section>
    </>
  );
}
