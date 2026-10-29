'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ago, micro, pct, tone, usd } from '@/lib/format';
import type { Row } from '@/lib/types';
import { Badge, Empty, ErrorBox, Loading, Panel, Stat, StateBadge, label } from '@/components/ui';

const FUNNEL: Array<{ key: string; states: string[] }> = [
  {
    key: 'Discovered',
    states: [
      'DISCOVERED',
      'FILTER_PENDING',
      'FILTER_APPROVED',
      'FILTER_REJECTED',
      'FILTER_UNVERIFIED',
      'FILTER_ERROR',
      'ANALYST_PENDING',
      'ANALYST_APPROVED',
      'ANALYST_REJECTED',
      'ANALYST_UNVERIFIED',
      'RISK_PENDING',
      'RISK_AUTHORIZED',
      'RISK_REJECTED',
      'RISK_PAUSED',
      'PAPER_ORDER_PENDING',
      'PAPER_FILLED',
      'PAPER_REJECTED',
      'POSITION_OPEN',
      'EXIT_PENDING',
      'EXIT_FAILED',
      'POSITION_CLOSED',
      'EXPIRED',
    ],
  },
  {
    key: 'Filter approved',
    states: [
      'FILTER_APPROVED',
      'ANALYST_PENDING',
      'ANALYST_APPROVED',
      'ANALYST_REJECTED',
      'ANALYST_UNVERIFIED',
      'RISK_PENDING',
      'RISK_AUTHORIZED',
      'RISK_REJECTED',
      'RISK_PAUSED',
      'PAPER_ORDER_PENDING',
      'PAPER_FILLED',
      'PAPER_REJECTED',
      'POSITION_OPEN',
      'EXIT_PENDING',
      'EXIT_FAILED',
      'POSITION_CLOSED',
    ],
  },
  {
    key: 'Analyst approved',
    states: [
      'ANALYST_APPROVED',
      'RISK_PENDING',
      'RISK_AUTHORIZED',
      'RISK_REJECTED',
      'RISK_PAUSED',
      'PAPER_ORDER_PENDING',
      'PAPER_FILLED',
      'PAPER_REJECTED',
      'POSITION_OPEN',
      'EXIT_PENDING',
      'EXIT_FAILED',
      'POSITION_CLOSED',
    ],
  },
  {
    key: 'Risk authorized',
    states: [
      'RISK_AUTHORIZED',
      'PAPER_ORDER_PENDING',
      'PAPER_FILLED',
      'PAPER_REJECTED',
      'POSITION_OPEN',
      'EXIT_PENDING',
      'EXIT_FAILED',
      'POSITION_CLOSED',
    ],
  },
  {
    key: 'Paper filled',
    states: ['PAPER_FILLED', 'POSITION_OPEN', 'EXIT_PENDING', 'EXIT_FAILED', 'POSITION_CLOSED'],
  },
];

export default function Overview() {
  const q = useQuery({
    queryKey: ['overview'],
    queryFn: () => api<Row>('/overview'),
    refetchInterval: 10_000,
  });
  if (q.error) return <ErrorBox error={q.error} />;
  if (!q.data) return <Loading />;
  const d = q.data;
  const p = d.portfolio as Row | null;
  const funnel = d.funnel as Record<string, number>;
  const discovered =
    (funnel.DISCOVERY_REJECTED ?? 0) + FUNNEL[0]!.states.reduce((s, k) => s + (funnel[k] ?? 0), 0);
  const stages = [
    { key: 'Seen', n: discovered },
    ...FUNNEL.map((f) => ({ key: f.key, n: f.states.reduce((s, k) => s + (funnel[k] ?? 0), 0) })),
  ];
  const marks = p?.marksComplete ? 'PAPER' : 'ESTIMATE';
  return (
    <div className="space-y-5">
      {(d.breakers as Row[]).length > 0 && (
        <div className="rounded-lg border border-down/30 bg-down-dim px-4 py-3 text-[13px] text-down">
          <strong className="font-medium">New entries paused.</strong> Active circuit breaker
          {(d.breakers as Row[]).length > 1 ? 's' : ''}:{' '}
          {(d.breakers as Row[]).map((b) => label(b.breaker)).join(', ')}. Open positions remain protected.{' '}
          <Link href="/risk/" className="underline">
            Risk Center →
          </Link>
        </div>
      )}
      {!d.monitorAlive && (
        <div className="rounded-lg border border-warn/30 bg-warn-dim px-4 py-3 text-[13px] text-warn">
          The monitor service has not reported a heartbeat in the last minute. Stops and exits run in the
          monitor, so check System Health.
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat
          label="Equity"
          prov={marks}
          value={usd(micro(p?.equityMicro))}
          sub={`started ${usd(micro(p?.startingEquityMicro), { compact: true })}`}
        />
        <Stat
          label="Cash"
          prov="PAPER"
          value={usd(micro(p?.cashMicro))}
          sub={`${p?.activePositions ?? 0} open position${p?.activePositions === 1 ? '' : 's'}`}
        />
        <Stat
          label="Unrealized"
          prov={p?.activePositions ? 'ESTIMATE' : 'PAPER'}
          value={usd(micro(p?.unrealizedMicro), { sign: true })}
          toneClass={tone(micro(p?.unrealizedMicro))}
          sub="at executable quotes"
        />
        <Stat
          label="Realized"
          prov="PAPER"
          value={usd(micro(p?.realizedMicro), { sign: true })}
          toneClass={tone(micro(p?.realizedMicro))}
          sub={`${p?.closedTrades ?? 0} closed trades`}
        />
        <Stat
          label="Today"
          prov={marks}
          value={usd(micro(p?.dailyChangeMicro), { sign: true })}
          toneClass={tone(micro(p?.dailyChangeMicro))}
          sub={`${usd(micro(p?.cumulativeChangeMicro), { sign: true })} since start`}
        />
        <Stat
          label="Exposure"
          prov="PAPER"
          value={pct(p?.exposurePct)}
          sub={`max drawdown ${p?.maxDrawdownPct === null || p?.maxDrawdownPct === undefined ? '—' : pct(p.maxDrawdownPct)}`}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_1fr]">
        <Panel title="Candidate funnel · last 24h" right={<span>actual decisions</span>}>
          <div className="space-y-2.5">
            {stages.map((s, i) => (
              <div key={s.key} className="grid grid-cols-[130px_1fr_60px] items-center gap-3 text-[13px]">
                <span className="text-fg-2">{s.key}</span>
                <div className="h-6 overflow-hidden rounded bg-panel-2">
                  <div
                    className="h-full rounded bg-gradient-to-r from-signal/70 to-signal/30"
                    style={{
                      width: `${stages[0]!.n ? Math.max(1.5, (s.n / stages[0]!.n) * 100) : 0}%`,
                      opacity: 1 - i * 0.12,
                    }}
                  />
                </div>
                <span className="num text-right">{s.n}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-fg-3">
            Candidates the Filter cannot verify (for example without a holder-clustering indexer) stop at{' '}
            <span className="text-warn">FILTER UNVERIFIED</span>. That is the system failing closed, not an
            error.
          </p>
        </Panel>
        <Panel
          title="Agents"
          right={
            <Link href="/agents/" className="hover:text-fg">
              details →
            </Link>
          }
          pad={false}
        >
          <table className="grid-table">
            <tbody>
              {['scout', 'filter', 'analyst', 'risk', 'executor', 'position-monitor', 'monitor'].map((id) => {
                const j = (d.agents as Row[]).find((a) => a.id === id);
                return (
                  <tr key={id}>
                    <td className="capitalize">{id === 'position-monitor' ? 'Position monitor' : id}</td>
                    <td>{j ? <StateBadge state={j.status} /> : <Badge>no data</Badge>}</td>
                    <td className="r num text-fg-3">{j?.last_success_at ? ago(j.last_success_at) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="Top-ranked opportunities"
          right={
            <Link href="/opportunities/" className="hover:text-fg">
              all →
            </Link>
          }
          pad={false}
        >
          {(d.topOpportunities as Row[]).length === 0 ? (
            <Empty>No eligible opportunities. Every candidate so far failed or could not be verified.</Empty>
          ) : (
            <table className="grid-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Token</th>
                  <th>State</th>
                  <th className="r">Score</th>
                  <th className="r">Signal</th>
                </tr>
              </thead>
              <tbody>
                {(d.topOpportunities as Row[]).map((o) => (
                  <tr key={o.candidate_id}>
                    <td className="num text-fg-3">{o.rank ?? '—'}</td>
                    <td>
                      <Link href={`/token/?mint=${o.mint}`} className="hover:text-signal">
                        {o.symbol ?? o.mint.slice(0, 6)}
                      </Link>
                    </td>
                    <td>
                      <StateBadge state={o.state} />
                    </td>
                    <td className="r num">{Number(o.score).toFixed(1)}</td>
                    <td className="r num text-fg-3">{ago(o.signal_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        <Panel
          title="Recent rejections"
          right={
            <Link href="/discover/?view=rejected" className="hover:text-fg">
              all →
            </Link>
          }
          pad={false}
        >
          {(d.recentRejections as Row[]).length === 0 ? (
            <Empty>No rejected candidates yet.</Empty>
          ) : (
            <table className="grid-table">
              <tbody>
                {(d.recentRejections as Row[]).map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/token/?mint=${r.mint}`} className="hover:text-signal">
                        {r.symbol ?? r.mint.slice(0, 6)}
                      </Link>
                    </td>
                    <td>
                      <StateBadge state={r.state} />
                    </td>
                    <td className="num max-w-[220px] truncate text-xs text-fg-3">
                      {(JSON.parse(r.rejection_codes || '[]') as string[]).join(' · ') || '—'}
                    </td>
                    <td className="r num text-fg-3">{ago(r.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="Feed freshness · last hour"
          right={
            <Link href="/health/" className="hover:text-fg">
              health →
            </Link>
          }
          pad={false}
        >
          {(d.feeds as Row[]).length === 0 ? (
            <Empty>No provider calls recorded in the last hour.</Empty>
          ) : (
            <table className="grid-table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th className="r">Calls</th>
                  <th className="r">Errors</th>
                  <th className="r">Last success</th>
                </tr>
              </thead>
              <tbody>
                {(d.feeds as Row[]).map((f) => (
                  <tr key={f.provider_id}>
                    <td>{f.provider_id}</td>
                    <td className="r num">{f.calls}</td>
                    <td className={`r num ${Number(f.errors) ? 'text-warn' : 'text-fg-3'}`}>{f.errors}</td>
                    <td className="r num text-fg-3">{ago(f.last_ok)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        <Panel
          title="Unacknowledged alerts"
          right={
            <Link href="/health/" className="hover:text-fg">
              all →
            </Link>
          }
          pad={false}
        >
          {(d.alerts as Row[]).length === 0 ? (
            <Empty>No open alerts.</Empty>
          ) : (
            <table className="grid-table">
              <tbody>
                {(d.alerts as Row[]).map((a) => (
                  <tr key={a.id}>
                    <td>
                      <StateBadge state={a.severity} />
                    </td>
                    <td className="max-w-[340px] truncate">{a.title}</td>
                    <td className="r num text-fg-3">{ago(a.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
    </div>
  );
}
