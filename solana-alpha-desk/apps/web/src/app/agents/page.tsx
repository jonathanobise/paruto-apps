'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ago } from '@/lib/format';
import type { Row } from '@/lib/types';
import { Badge, Empty, ErrorBox, KV, Loading, Panel, Prov, StateBadge, label } from '@/components/ui';

export default function Agents() {
  const q = useQuery({ queryKey: ['agents'], queryFn: () => api<Row>('/agents'), refetchInterval: 5_000 });
  if (q.error) return <ErrorBox error={q.error} />;
  if (!q.data) return <Loading />;
  return (
    <div className="space-y-5">
      <p className="text-xs text-fg-3">
        Agent state below is read from heartbeats and decisions persisted by the running services{' '}
        <Prov kind="ACTUAL" /> — nothing here is animated or simulated.
      </p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(q.data.agents as Row[]).map((a) => {
          const j = a.job as Row | null;
          const fresh = j?.heartbeat_at ? Date.now() - j.heartbeat_at < 120_000 : false;
          return (
            <Panel
              key={a.id}
              title={a.name}
              right={j ? <StateBadge state={fresh ? j.status : 'UNAVAILABLE'} /> : <Badge>never ran</Badge>}
            >
              <p className="mb-3 text-xs text-fg-3">{a.role}</p>
              <KV
                rows={[
                  ['Last heartbeat', ago(j?.heartbeat_at)],
                  ['Last success', ago(j?.last_success_at)],
                  ['Processed', j?.processed ?? 0],
                  ['Rejections', j?.rejected ?? 0],
                  ['Latency (last)', j?.last_latency_ms ? `${j.last_latency_ms} ms` : '—'],
                  ['Queue depth', a.queueDepth],
                  [
                    'Dead letters',
                    <span key="d" className={a.deadLetters ? 'text-down' : ''}>
                      {a.deadLetters}
                    </span>,
                  ],
                ]}
              />
              {j?.last_error && (
                <div
                  className="mt-3 rounded-md border border-down/25 bg-down-dim px-2.5 py-1.5 text-xs text-down"
                  title={j.last_error}
                >
                  {String(j.last_error).slice(0, 160)} · {ago(j.last_error_at)}
                </div>
              )}
              {Object.keys(a.decisions24h).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {Object.entries(a.decisions24h as Record<string, number>).map(([state, n]) => (
                    <span key={state} className="inline-flex items-center gap-1">
                      <StateBadge state={state} />
                      <span className="num text-[11px] text-fg-3">{n}</span>
                    </span>
                  ))}
                </div>
              )}
            </Panel>
          );
        })}
      </div>
      <Panel title="Services and loops" pad={false}>
        {(q.data.services as Row[]).length === 0 ? (
          <Empty>No service has reported yet. Start the monitor with `pnpm monitor`.</Empty>
        ) : (
          <table className="grid-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Status</th>
                <th className="r">Heartbeat</th>
                <th className="r">Restarts</th>
                <th>Last error</th>
              </tr>
            </thead>
            <tbody>
              {(q.data.services as Row[]).map((s) => (
                <tr key={s.id}>
                  <td>{label(s.id)}</td>
                  <td>
                    <StateBadge state={s.status} />
                  </td>
                  <td className="r num text-fg-3">{ago(s.heartbeat_at)}</td>
                  <td className="r num">{s.restarts}</td>
                  <td className="max-w-[420px] truncate text-xs text-fg-3" title={s.last_error ?? ''}>
                    {s.last_error ?? ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
