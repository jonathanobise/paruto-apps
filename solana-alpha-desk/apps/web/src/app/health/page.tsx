'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ago, num, parseJson } from '@/lib/format';
import type { Row } from '@/lib/types';
import { Badge, Button, Empty, ErrorBox, Loading, Panel, StateBadge, label } from '@/components/ui';

export default function Health() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['health'], queryFn: () => api<Row>('/health'), refetchInterval: 10_000 });
  if (q.error) return <ErrorBox error={q.error} />;
  if (!q.data) return <Loading />;
  const d = q.data;
  const recon = d.reconciliation as Row | null;
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Data providers" pad={false}>
          <table className="grid-table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Integration</th>
                <th className="r">Calls · 1h</th>
                <th className="r">Errors</th>
                <th className="r">429s</th>
                <th className="r">Avg latency</th>
                <th className="r">Last success</th>
              </tr>
            </thead>
            <tbody>
              {(d.providers as Row[]).map((p) => {
                const h = (d.health as Row[]).find((x) => x.provider_id === p.id);
                return (
                  <tr key={p.id}>
                    <td title={p.licence_note}>{p.id}</td>
                    <td>
                      <Badge tone={p.integration_status === 'OPERATIONAL' ? 'up' : 'warn'}>
                        {label(p.integration_status)}
                      </Badge>
                    </td>
                    <td className="r num">{h ? num(h.calls) : '—'}</td>
                    <td className={`r num ${h && Number(h.errors) ? 'text-warn' : 'text-fg-3'}`}>
                      {h ? num(h.errors) : '—'}
                    </td>
                    <td className="r num text-fg-3">{h ? num(h.rate_limited) : '—'}</td>
                    <td className="r num">{h ? `${num(h.avg_latency_ms)} ms` : '—'}</td>
                    <td className="r num text-fg-3">{ago(h?.last_success_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="space-y-1 border-t border-line px-4 py-3 text-xs text-fg-3">
            {(d.providers as Row[]).map((p) => (
              <div key={p.id}>
                <span className="text-fg-2">{p.id}:</span> {p.licence_note}
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Integrity">
          <div className="space-y-3 text-[13px]">
            <div className="flex items-center justify-between">
              <span className="text-fg-2">Ledger reconciliation</span>
              {recon ? <StateBadge state={recon.action} /> : <Badge>not run</Badge>}
            </div>
            {recon && (
              <div className="text-xs text-fg-3">
                {ago(recon.created_at)} ·{' '}
                {(parseJson<Row>(recon.detail, {}).issues as string[] | undefined)?.join('; ') ||
                  'ledger matches positions'}
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-fg-2">Latest market snapshot</span>
              <span className="num text-fg-3">{ago(d.freshness.lastMarketSnapshotAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-fg-2">Work queues</span>
              <span className="num text-fg-3">
                {Object.entries(d.queues as Record<string, number>)
                  .map(([k, v]) => `${k} ${v}`)
                  .join(' · ') || 'empty'}
              </span>
            </div>
          </div>
        </Panel>
      </div>
      <Panel title="Alerts" pad={false}>
        {(d.alerts as Row[]).length === 0 ? (
          <Empty>No alerts.</Empty>
        ) : (
          <div className="max-h-[50vh] overflow-auto">
            <table className="grid-table">
              <tbody>
                {(d.alerts as Row[]).map((a) => (
                  <tr key={a.id} className={a.acknowledged_at ? 'opacity-50' : ''}>
                    <td>
                      <StateBadge state={a.severity} />
                    </td>
                    <td className="text-fg-3">{a.source}</td>
                    <td>{a.title}</td>
                    <td className="max-w-[420px] truncate text-xs text-fg-3" title={a.detail}>
                      {a.detail}
                    </td>
                    <td className="r num text-fg-3">{ago(a.created_at)}</td>
                    <td className="r">
                      {!a.acknowledged_at && (
                        <Button
                          small
                          tone="ghost"
                          onClick={async () => {
                            await api(`/alerts/${a.id}/ack`, { method: 'POST' });
                            await qc.invalidateQueries({ queryKey: ['health'] });
                          }}
                        >
                          Acknowledge
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Background jobs" pad={false}>
          <table className="grid-table">
            <tbody>
              {(d.jobs as Row[]).map((j) => (
                <tr key={j.id}>
                  <td>{j.id}</td>
                  <td>
                    <StateBadge state={j.status} />
                  </td>
                  <td className="r num text-fg-3">{ago(j.heartbeat_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel title="Dead letters" pad={false}>
          {(d.deadLetters as Row[]).length === 0 ? (
            <Empty>No dead-lettered work.</Empty>
          ) : (
            <table className="grid-table">
              <tbody>
                {(d.deadLetters as Row[]).map((w) => (
                  <tr key={w.id}>
                    <td>{w.queue}</td>
                    <td className="max-w-[360px] truncate text-xs text-down" title={w.last_error}>
                      {w.last_error}
                    </td>
                    <td className="r num text-fg-3">{ago(w.updated_at)}</td>
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
