'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ago, usd } from '@/lib/format';
import type { Row } from '@/lib/types';
import { Button, Empty, ErrorBox, Loading, Panel, StateBadge } from '@/components/ui';

export default function Opportunities() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => api<{ rows: Row[]; changes: Row[] }>('/opportunities'),
    refetchInterval: 10_000,
  });
  const ov = useQuery({ queryKey: ['overview'], queryFn: () => api<Row>('/overview') });
  const manual = ov.data?.mode === 'PAPER_MANUAL';
  if (q.error) return <ErrorBox error={q.error} />;
  if (!q.data) return <Loading />;
  return (
    <div className="space-y-5">
      <Panel
        title="Ranked opportunities"
        right={
          <span>
            ranked by eligibility · score · data quality · execution depth · independent buyers · recency
          </span>
        }
        pad={false}
      >
        {q.data.rows.length === 0 ? (
          <Empty>No candidate has passed both the Filter and the Analyst yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="grid-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Token</th>
                  <th>Status</th>
                  <th>Pipeline state</th>
                  <th className="r">Score</th>
                  <th className="r">Verified weight</th>
                  <th className="r">Execution depth</th>
                  <th className="r">Buyer clusters</th>
                  <th className="r">Signal</th>
                  <th className="r">Eligible until</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {q.data.rows.map((o) => (
                  <tr key={o.id}>
                    <td className="num text-fg-3">{o.rank ?? '—'}</td>
                    <td>
                      <Link href={`/token/?mint=${o.mint}`} className="font-medium hover:text-signal">
                        {o.symbol}
                      </Link>
                    </td>
                    <td>
                      <StateBadge state={o.status} />
                    </td>
                    <td>
                      <StateBadge state={o.state} />
                    </td>
                    <td className="r num">{Number(o.score).toFixed(1)}</td>
                    <td className="r num">{o.data_quality}</td>
                    <td className="r num">{usd(o.execution_depth_usd, { compact: true })}</td>
                    <td className="r num">{o.buyer_clusters ?? '—'}</td>
                    <td className="r num text-fg-3">{ago(o.signal_at)}</td>
                    <td className="r num text-fg-3">{o.eligible_until ? ago(o.eligible_until) : '—'}</td>
                    <td>
                      {manual && o.state === 'ANALYST_APPROVED' && (
                        <Button
                          small
                          tone="primary"
                          onClick={async () => {
                            await api(`/opportunities/${o.candidate_id}/approve`, { method: 'POST' });
                            await qc.invalidateQueries({ queryKey: ['opportunities'] });
                          }}
                        >
                          Send to Risk
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
      {manual && (
        <p className="text-xs text-fg-3">
          PAPER_MANUAL mode: approving sends the opportunity to the Risk agent, which still sizes and
          authorizes (or rejects) it independently.
        </p>
      )}
      <Panel title="Ranking changes" pad={false}>
        {q.data.changes.length === 0 ? (
          <Empty>No ranking changes recorded.</Empty>
        ) : (
          <table className="grid-table">
            <tbody>
              {q.data.changes.map((c) => (
                <tr key={c.id}>
                  <td className="num text-fg-3">{String(c.opportunity_id).slice(-8)}</td>
                  <td className="num">
                    {c.previous_rank ?? 'new'} → {c.new_rank}
                  </td>
                  <td className="text-fg-2">{c.reason}</td>
                  <td className="r num text-fg-3">{ago(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
