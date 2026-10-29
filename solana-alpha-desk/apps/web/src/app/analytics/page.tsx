'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { pct, tone, usd } from '@/lib/format';
import type { Row } from '@/lib/types';
import { TimeChart } from '@/components/chart';
import { Bar, Empty, ErrorBox, Loading, Panel, Prov, Stat, Tabs } from '@/components/ui';
import { ReplayPanel } from '@/components/replay';

const SEGMENTS = [
  { id: 'tokenAge', label: 'Token age' },
  { id: 'marketCap', label: 'Market cap' },
  { id: 'liquidity', label: 'Liquidity' },
  { id: 'scoreBand', label: 'Score band' },
  { id: 'hourUtc', label: 'Time of day' },
  { id: 'strategy', label: 'Strategy version' },
  { id: 'exitReason', label: 'Exit reason' },
] as const;

export default function Analytics() {
  const q = useQuery({
    queryKey: ['analytics'],
    queryFn: () => api<Row>('/analytics'),
    refetchInterval: 30_000,
  });
  const [seg, setSeg] = useState<(typeof SEGMENTS)[number]['id']>('tokenAge');
  const curve = useMemo(
    () =>
      ((q.data?.equityCurve as Row[] | undefined) ?? []).map((e) => ({
        at: e.at as number,
        value: e.equity as number,
      })),
    [q.data],
  );
  if (q.error) return <ErrorBox error={q.error} />;
  if (!q.data) return <Loading />;
  const m = q.data.metrics as Row;
  const v = q.data.validation as { target: number; completed: number };
  return (
    <div className="space-y-5">
      <Panel title="Paper-trading validation" right={<Prov kind="PAPER" />}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="num text-2xl">
            {v.completed} <span className="text-fg-3">/ {v.target} trades</span>
          </div>
          <div className="min-w-48 flex-1">
            <Bar value={v.completed} max={v.target} />
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-fg-3">
          {m.statisticalNote} Results are net of modelled fees, price impact and slippage.
        </p>
      </Panel>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Stat label="Trades" value={m.trades} />
        <Stat label="Win rate" value={pct(m.winRatePct)} />
        <Stat label="Avg win" value={usd(m.avgWinUsd)} toneClass="text-up" />
        <Stat label="Avg loss" value={usd(m.avgLossUsd)} toneClass="text-down" />
        <Stat
          label="Expectancy"
          value={usd(m.expectancyUsd, { sign: true })}
          toneClass={tone(Number(m.expectancyUsd))}
          sub={m.expectancyR ? `${m.expectancyR} R` : undefined}
        />
        <Stat label="Profit factor" value={m.profitFactor ?? '—'} />
        <Stat label="Max drawdown" value={pct(m.maxDrawdownPct)} />
        <Stat
          label="Sharpe · Sortino"
          value={m.sharpe ?? '—'}
          sub={m.sortino ? `Sortino ${m.sortino}` : 'needs 30+ daily returns'}
        />
      </div>
      <Panel title="Equity" right={<Prov kind="PAPER" />}>
        {curve.length < 2 ? (
          <Empty>No equity history yet.</Empty>
        ) : (
          <TimeChart points={curve} height={240} format="usd" color="#35c48f" />
        )}
      </Panel>
      <Panel
        title="Results by segment"
        right={
          <Tabs tabs={SEGMENTS.map((s) => ({ id: s.id, label: s.label }))} value={seg} onChange={setSeg} />
        }
        pad={false}
      >
        {((q.data.segments as Record<string, Row[]>)[seg] ?? []).length === 0 ? (
          <Empty>No closed trades to segment.</Empty>
        ) : (
          <table className="grid-table">
            <thead>
              <tr>
                <th>Segment</th>
                <th className="r">Trades</th>
                <th className="r">Win rate</th>
                <th className="r">Expectancy</th>
                <th className="r">Net P&L</th>
                <th className="r">Profit factor</th>
              </tr>
            </thead>
            <tbody>
              {(q.data.segments as Record<string, Row[]>)[seg]!.map((s) => (
                <tr key={s.key}>
                  <td>{s.key}</td>
                  <td className="r num">{s.metrics.trades}</td>
                  <td className="r num">{pct(s.metrics.winRatePct)}</td>
                  <td className={`r num ${tone(Number(s.metrics.expectancyUsd))}`}>
                    {usd(s.metrics.expectancyUsd, { sign: true })}
                  </td>
                  <td className={`r num ${tone(Number(s.metrics.netPnlUsd))}`}>
                    {usd(s.metrics.netPnlUsd, { sign: true })}
                  </td>
                  <td className="r num">{s.metrics.profitFactor ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
      <ReplayPanel />
      <div className="text-xs text-fg-3">
        Net P&L {usd(m.netPnlUsd, { sign: true })} · fees {usd(m.feesUsd)} · average holding{' '}
        {m.avgDurationMinutes ?? '—'} min.
      </div>
    </div>
  );
}
