'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { dt } from '@/lib/format';
import type { Row } from '@/lib/types';
import { Button, Empty, ErrorBox, Loading, Panel, StateBadge, label } from '@/components/ui';

const KINDS = [
  'MORNING',
  'DAILY_PNL',
  'REJECTION_FUNNEL',
  'AGENT_RELIABILITY',
  'WEEKLY',
  'STRATEGY_COMPARISON',
  'INCIDENT',
];

function ReportView({ id }: { id: string }) {
  const q = useQuery({ queryKey: ['report', id], queryFn: () => api<Row>(`/reports/${id}`) });
  if (q.error) return <ErrorBox error={q.error} />;
  if (!q.data) return <Loading />;
  const b = q.data.body as Row;
  const download = () => {
    const blob = new Blob([JSON.stringify(b, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `alpha-desk-${String(b.kind).toLowerCase()}-${String(b.period?.end).slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <Panel
      title={label(b.kind)}
      right={
        <Button small onClick={download}>
          Export JSON
        </Button>
      }
    >
      <div className="mb-3 text-xs text-fg-3">
        Period {dt(Date.parse(b.period?.start))} → {dt(Date.parse(b.period?.end))} · timezone{' '}
        {b.period?.timezone} · sha256 <span className="num">{String(q.data.sha256).slice(0, 16)}…</span>
      </div>
      <div className="mb-3 rounded-md border border-signal/30 bg-signal-dim/40 px-3 py-2 text-xs text-fg-2">
        {b.disclaimer}
      </div>
      <pre className="num max-h-[60vh] overflow-auto rounded-md border border-line bg-ink p-3 text-[11px] leading-relaxed text-fg-2">
        {JSON.stringify(
          Object.fromEntries(
            Object.entries(b).filter(([k]) => !['disclaimer', 'period', 'kind'].includes(k)),
          ),
          null,
          2,
        )}
      </pre>
    </Panel>
  );
}

export default function Reports() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['reports'],
    queryFn: () => api<{ rows: Row[] }>('/reports'),
    refetchInterval: 30_000,
  });
  const [sel, setSel] = useState<string | null>(null);
  const [err, setErr] = useState<unknown>(null);
  return (
    <div className="space-y-5">
      <Panel title="Generate a report now">
        <div className="flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <Button
              key={k}
              small
              onClick={async () => {
                setErr(null);
                try {
                  const r = await api<{ id: string }>('/reports/generate', {
                    method: 'POST',
                    body: { kind: k },
                  });
                  await qc.invalidateQueries({ queryKey: ['reports'] });
                  setSel(r.id);
                } catch (e) {
                  setErr(e);
                }
              }}
            >
              {label(k)}
            </Button>
          ))}
        </div>
        <p className="mt-3 text-xs text-fg-3">
          The monitor also generates the morning, daily P&L, funnel and reliability reports at the configured
          local hour, and weekly reports on Mondays.
        </p>
        <ErrorBox error={err} />
      </Panel>
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <Panel title="Archive" pad={false}>
          {!q.data ? (
            <div className="p-4">
              <Loading />
            </div>
          ) : q.data.rows.length === 0 ? (
            <Empty>No reports yet.</Empty>
          ) : (
            <div className="max-h-[70vh] overflow-auto">
              <table className="grid-table">
                <tbody>
                  {q.data.rows.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setSel(r.id)}
                      className={`cursor-pointer ${sel === r.id ? 'bg-panel-2' : ''}`}
                    >
                      <td>{label(r.kind)}</td>
                      <td>
                        <StateBadge state={r.status} />
                      </td>
                      <td className="r num text-xs text-fg-3">{dt(r.created_at).slice(0, 16)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        {sel ? (
          <ReportView id={sel} />
        ) : (
          <Panel>
            <Empty>Select a report.</Empty>
          </Panel>
        )}
      </div>
    </div>
  );
}
