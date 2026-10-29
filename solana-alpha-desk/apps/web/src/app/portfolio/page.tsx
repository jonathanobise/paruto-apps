'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ago, dt, micro, num, tone, usd } from '@/lib/format';
import type { Row } from '@/lib/types';
import { TimeChart } from '@/components/chart';
import { Empty, ErrorBox, Loading, Panel, Prov, Stat, StateBadge, label } from '@/components/ui';

export default function Portfolio() {
  const q = useQuery({
    queryKey: ['portfolio'],
    queryFn: () => api<Row>('/portfolio'),
    refetchInterval: 15_000,
  });
  const pos = useQuery({
    queryKey: ['positions', 'all'],
    queryFn: () => api<{ rows: Row[] }>('/positions'),
    refetchInterval: 15_000,
  });
  const curve = useMemo(
    () =>
      ((q.data?.equityCurve as Row[] | undefined) ?? []).map((e) => ({
        at: e.observed_at as number,
        value: Number(e.equity_micro) / 1e6,
      })),
    [q.data],
  );
  if (q.error) return <ErrorBox error={q.error} />;
  if (!q.data) return <Loading />;
  const d = q.data;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Equity"
          prov={d.marksComplete ? 'PAPER' : 'ESTIMATE'}
          value={usd(micro(d.equityMicro))}
        />
        <Stat label="Cash (ledger)" prov="PAPER" value={usd(micro(d.cashMicro))} />
        <Stat
          label="Positions at mark"
          prov={d.marksComplete ? 'PAPER' : 'ESTIMATE'}
          value={usd(micro(d.positionsValueMicro))}
        />
        <Stat
          label="Since"
          value={d.portfolio ? new Date(d.portfolio.created_at).toISOString().slice(0, 10) : '—'}
          sub={d.portfolio?.name}
        />
      </div>
      <Panel title="Equity curve" right={<Prov kind="PAPER" />}>
        {curve.length < 2 ? (
          <Empty>The equity curve fills in as the monitor records snapshots (every minute).</Empty>
        ) : (
          <TimeChart points={curve} height={260} format="usd" color="#35c48f" />
        )}
      </Panel>
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Ledger balances (double entry)" pad={false}>
          <table className="grid-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Unit</th>
                <th className="r">Balance</th>
              </tr>
            </thead>
            <tbody>
              {(d.balances as Row[]).map((b) => (
                <tr key={`${b.account}${b.unit}`}>
                  <td>{b.account}</td>
                  <td className="num text-fg-3">{b.unit === 'USD' ? 'USD' : `${b.unit.slice(0, 6)}…`}</td>
                  <td className="r num">{b.unit === 'USD' ? usd(Number(b.amount) / 1e6) : num(b.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-3 text-xs text-fg-3">
            Debits are positive and credits negative; every journal balances to zero per unit. Reconciliation
            against positions runs every five minutes.
          </p>
        </Panel>
        <Panel title="Recent journals" pad={false}>
          <div className="max-h-80 overflow-auto">
            <table className="grid-table">
              <tbody>
                {(d.journals as Row[]).map((j) => (
                  <tr key={j.id}>
                    <td>
                      <StateBadge state={j.kind} />
                    </td>
                    <td className="max-w-[280px] truncate text-fg-2">{j.memo}</td>
                    <td className="r num text-fg-3">{ago(j.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
      <Panel title="Positions" pad={false}>
        {!pos.data ? null : pos.data.rows.length === 0 ? (
          <Empty>No positions in this portfolio.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="grid-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Status</th>
                  <th>Exit reason</th>
                  <th className="r">Cost</th>
                  <th className="r">Realized</th>
                  <th className="r">Entry</th>
                  <th className="r">Exit</th>
                </tr>
              </thead>
              <tbody>
                {pos.data.rows.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link className="hover:text-signal" href={`/position/?id=${p.id}`}>
                        {p.symbol ?? p.mint.slice(0, 6)}
                      </Link>
                    </td>
                    <td>
                      <StateBadge state={p.status} />
                    </td>
                    <td className="text-fg-2">{label(p.exit_reason)}</td>
                    <td className="r num">{usd(micro(p.entry_cost_micro))}</td>
                    <td className={`r num ${tone(micro(p.realized_pnl_micro))}`}>
                      {usd(micro(p.realized_pnl_micro), { sign: true })}
                    </td>
                    <td className="r num text-fg-3">{dt(p.entry_at)}</td>
                    <td className="r num text-fg-3">{dt(p.exit_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <Panel title="Experiments" pad={false}>
        <table className="grid-table">
          <tbody>
            {(d.portfolios as Row[]).map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>
                  <StateBadge state={p.status} />
                </td>
                <td className="r num">{usd(micro(p.starting_equity_micro))}</td>
                <td className="r num text-fg-3">{dt(p.created_at)}</td>
                <td className="text-xs text-fg-3">{p.archived_reason ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
