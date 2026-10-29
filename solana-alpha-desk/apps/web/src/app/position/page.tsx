'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { dt, micro, num, price, tone, usd } from '@/lib/format';
import type { Row } from '@/lib/types';
import { TimeChart } from '@/components/chart';
import { Empty, ErrorBox, KV, Loading, Panel, Prov, StateBadge, label } from '@/components/ui';

function Position() {
  const id = useSearchParams().get('id');
  const q = useQuery({
    queryKey: ['position', id],
    queryFn: () => api<Row>(`/positions/${id}`),
    enabled: Boolean(id),
    refetchInterval: 4_000,
  });
  const marks = useMemo(
    () =>
      ((q.data?.marks as Row[] | undefined) ?? [])
        .filter((m) => m.reference_price_usd)
        .map((m) => ({ at: m.observed_at as number, value: Number(m.reference_price_usd) })),
    [q.data],
  );
  const p = q.data?.position as Row | undefined;
  const lines = useMemo(
    () =>
      p
        ? [
            { value: Number(p.effective_stop_usd), color: '#f0615b', title: 'stop' },
            { value: Number(p.entry_reference_price_usd), color: '#6c7486', title: 'entry ref' },
          ]
        : [],
    [p],
  );
  if (!id) return <Empty>No position selected.</Empty>;
  if (q.error) return <ErrorBox error={q.error} />;
  if (!q.data || !p) return <Loading />;
  const pnl = micro(p.realized_pnl_micro);
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Panel title={`${p.symbol ?? p.mint} · executable marks`} right={<Prov kind="PAPER" />}>
          {marks.length < 2 ? (
            <Empty>Not enough marks yet.</Empty>
          ) : (
            <TimeChart points={marks} lines={lines} height={280} />
          )}
        </Panel>
        <Panel title="Position">
          <KV
            rows={[
              ['Status', <StateBadge key="s" state={p.status} />],
              ['Entry', dt(p.entry_at)],
              ['Quantity', num(Number(p.quantity) / 10 ** p.token_decimals, 2)],
              ['Executed entry price', price(p.entry_price_usd)],
              ['Entry reference (exit quote)', price(p.entry_reference_price_usd)],
              ['Total entry cost', usd(micro(p.entry_cost_micro))],
              ['Entry fees', usd(micro(p.entry_fees_micro), { dp: 4 })],
              ['Planned risk (1R)', usd(micro(p.planned_risk_micro))],
              ['Initial stop', price(p.initial_stop_usd)],
              ['Effective stop', price(p.effective_stop_usd)],
              ['Highest reference', price(p.highest_reference_usd)],
              ['Lowest reference', price(p.lowest_reference_usd)],
              ['Exit reason', label(p.exit_reason)],
              ['Exit price', price(p.exit_price_usd)],
              [
                'Realized P&L',
                <span key="p" className={tone(pnl)}>
                  {usd(pnl, { sign: true })}
                </span>,
              ],
              ['Strategy', p.strategy_version],
            ]}
          />
        </Panel>
      </div>
      <Panel title="Stop history" pad={false}>
        <table className="grid-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Event</th>
              <th className="r">Previous</th>
              <th className="r">New</th>
              <th className="r">Reference</th>
            </tr>
          </thead>
          <tbody>
            {(q.data.stops as Row[]).map((s) => (
              <tr key={s.id}>
                <td className="num text-fg-3">{dt(s.created_at)}</td>
                <td>
                  <StateBadge state={s.kind} />
                </td>
                <td className="r num">{price(s.previous_stop_usd)}</td>
                <td className="r num">{price(s.new_stop_usd)}</td>
                <td className="r num">{price(s.reference_price_usd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <Panel title="Fills" pad={false}>
        <table className="grid-table">
          <thead>
            <tr>
              <th>Side</th>
              <th className="r">Price</th>
              <th className="r">Indicative</th>
              <th className="r">Slippage</th>
              <th className="r">USD</th>
              <th className="r">Fee</th>
              <th>Route</th>
              <th className="r">Latency</th>
              <th>Model</th>
            </tr>
          </thead>
          <tbody>
            {(q.data.fills as Row[]).map((f) => (
              <tr key={f.id}>
                <td>{f.side}</td>
                <td className="r num">{price(f.price_usd)}</td>
                <td className="r num">{price(f.quote_price_usd)}</td>
                <td className="r num">{num(f.slippage_bps, 1)} bp</td>
                <td className="r num">{usd(micro(f.usd_amount_micro))}</td>
                <td className="r num">{usd(micro(f.network_fee_micro), { dp: 4 })}</td>
                <td className="text-xs text-fg-2">{(JSON.parse(f.route) as string[]).join(' → ')}</td>
                <td className="r num">{f.latency_ms} ms</td>
                <td className="num text-xs text-fg-3">{f.model_version}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <Position />
    </Suspense>
  );
}
