'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ago, micro, num, parseJson, pct, price, tone, usd } from '@/lib/format';
import type { Row } from '@/lib/types';
import {
  Badge,
  Button,
  Confirm,
  Empty,
  ErrorBox,
  Loading,
  Panel,
  Prov,
  StateBadge,
  label,
} from '@/components/ui';

const MODES = [
  { mode: 'STOPPED', text: 'Stop everything except protection of open positions.' },
  { mode: 'DISCOVERY_ONLY', text: 'Discover, filter and score; never open positions.' },
  { mode: 'PAPER_MANUAL', text: 'Every entry needs your approval on the Opportunities page.' },
  {
    mode: 'PAPER_AUTONOMOUS',
    text: 'Risk-authorized entries are paper-traded automatically (overnight mode).',
  },
];

export default function Paper() {
  const qc = useQueryClient();
  const ov = useQuery({
    queryKey: ['overview'],
    queryFn: () => api<Row>('/overview'),
    refetchInterval: 5_000,
  });
  const pos = useQuery({
    queryKey: ['positions', 'open'],
    queryFn: () => api<{ rows: Row[] }>('/positions?status=open'),
    refetchInterval: 3_000,
  });
  const orders = useQuery({
    queryKey: ['orders'],
    queryFn: () => api<{ rows: Row[]; proposals: Row[] }>('/orders'),
    refetchInterval: 5_000,
  });
  const refresh = () => qc.invalidateQueries();
  const mode = ov.data?.mode as string | undefined;
  return (
    <div className="space-y-5">
      <Panel title="Session controls" right={<Prov kind="PAPER" />}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {MODES.map((m) => (
            <Confirm
              key={m.mode}
              title={`Switch to ${label(m.mode)}`}
              body={m.text}
              tone="primary"
              needReason={false}
              onConfirm={async () => {
                await api('/control/mode', {
                  method: 'POST',
                  body: { mode: m.mode, reason: `owner switched to ${m.mode}` },
                });
                await refresh();
              }}
              trigger={(open) => (
                <button
                  onClick={open}
                  disabled={mode === m.mode}
                  className={`rounded-lg border p-3 text-left transition ${mode === m.mode ? 'border-signal/60 bg-signal-dim/40' : 'border-line hover:border-line-strong hover:bg-panel-2'}`}
                >
                  <div className="flex items-center justify-between text-[13px] font-medium">
                    {label(m.mode)}
                    {mode === m.mode && <Badge tone="signal">active</Badge>}
                  </div>
                  <div className="mt-1 text-xs leading-relaxed text-fg-3">{m.text}</div>
                </button>
              )}
            />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
          <Confirm
            title="Emergency pause"
            body="Blocks every new entry immediately and trips the EMERGENCY_PAUSE breaker. Open positions stay protected by their stops. Leaving the pause requires the documented reset."
            onConfirm={async (reason) => {
              await api('/control/emergency-pause', { method: 'POST', body: { reason } });
              await refresh();
            }}
            trigger={(open) => (
              <Button tone="danger" onClick={open}>
                Emergency pause
              </Button>
            )}
          />
          <Confirm
            title="Simulate liquidation of all positions"
            body="Requests a paper exit for every open position at the routes available now. Fills are simulated; failures are recorded and retried."
            phrase="LIQUIDATE ALL"
            onConfirm={async (reason, typed) => {
              await api('/control/liquidate', { method: 'POST', body: { confirm: typed, reason } });
              await refresh();
            }}
            trigger={(open) => (
              <Button tone="danger" onClick={open}>
                Liquidate (simulated)
              </Button>
            )}
          />
          <Confirm
            title="Reset the paper portfolio"
            body="Archives the current experiment — its orders, fills, ledger and audit trail are kept — and starts a fresh portfolio. Refused while positions are open."
            phrase="RESET PORTFOLIO"
            onConfirm={async (reason, typed) => {
              await api('/control/portfolio/reset', { method: 'POST', body: { confirm: typed, reason } });
              await refresh();
            }}
            trigger={(open) => <Button onClick={open}>Reset portfolio…</Button>}
          />
        </div>
      </Panel>

      <Panel
        title="Open paper positions"
        right={<span>marks are executable sell quotes for the full size</span>}
        pad={false}
      >
        <ErrorBox error={pos.error} />
        {!pos.data ? (
          <div className="p-4">
            <Loading />
          </div>
        ) : pos.data.rows.length === 0 ? (
          <Empty>No open positions.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="grid-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Status</th>
                  <th className="r">Entry ref</th>
                  <th className="r">Mark</th>
                  <th className="r">Unrealized</th>
                  <th className="r">Stop</th>
                  <th>Trailing</th>
                  <th className="r">Cost</th>
                  <th className="r">Mark age</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pos.data.rows.map((p) => {
                  const qty = Number(p.quantity) / 10 ** p.token_decimals;
                  const value = p.last_mark_usd ? qty * Number(p.last_mark_usd) : null;
                  const pnl = value === null ? null : value - Number(p.entry_cost_micro) / 1e6;
                  return (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/position/?id=${p.id}`} className="font-medium hover:text-signal">
                          {p.symbol ?? p.mint.slice(0, 6)}
                        </Link>
                      </td>
                      <td>
                        <StateBadge state={p.status} />
                      </td>
                      <td className="r num">{price(p.entry_reference_price_usd)}</td>
                      <td className="r num">{price(p.last_mark_usd)}</td>
                      <td className={`r num ${tone(pnl)}`}>{usd(pnl, { sign: true })}</td>
                      <td className="r num">{price(p.effective_stop_usd)}</td>
                      <td>{p.trailing_active ? <Badge tone="up">active</Badge> : <Badge>at +12%</Badge>}</td>
                      <td className="r num">{usd(micro(p.entry_cost_micro))}</td>
                      <td className="r num text-fg-3">{ago(p.last_mark_at)}</td>
                      <td>
                        {p.status === 'OPEN' && (
                          <Confirm
                            title={`Close ${p.symbol ?? 'position'}`}
                            body="Requests a paper exit at the currently available route."
                            needReason={false}
                            onConfirm={async () => {
                              await api(`/positions/${p.id}/close`, { method: 'POST' });
                              await refresh();
                            }}
                            trigger={(open) => (
                              <Button small onClick={open}>
                                Close
                              </Button>
                            )}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Risk decisions and proposed sizes" pad={false}>
        {!orders.data ? (
          <div className="p-4">
            <Loading />
          </div>
        ) : orders.data.proposals.length === 0 ? (
          <Empty>No order has been proposed to Risk yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="grid-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Decision</th>
                  <th className="r">Authorized notional</th>
                  <th>Binding cap</th>
                  <th className="r">Est. entry cost</th>
                  <th className="r">Est. exit cost</th>
                  <th className="r">Loss fraction</th>
                  <th>Reasons</th>
                  <th className="r">When</th>
                </tr>
              </thead>
              <tbody>
                {orders.data.proposals.map((p) => {
                  const s = parseJson<Row>(p.sizing, {});
                  return (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/token/?mint=${p.mint}`} className="hover:text-signal">
                          {p.symbol}
                        </Link>
                      </td>
                      <td>
                        <StateBadge state={p.decision} />
                        {p.consumed_at ? (
                          <span className="ml-1 text-[11px] text-fg-3">used</span>
                        ) : p.invalidated_reason ? (
                          <span className="ml-1 text-[11px] text-warn" title={p.invalidated_reason}>
                            invalidated
                          </span>
                        ) : null}
                      </td>
                      <td className="r num">{usd(micro(p.requested_notional_micro))}</td>
                      <td className="text-fg-2">
                        {s.binding ? String(s.binding).replace('Micro', '') : '—'}
                      </td>
                      <td className="r num">{pct(s.entryCostPct)}</td>
                      <td className="r num">{pct(s.exitCostPct)}</td>
                      <td className="r num">{s.lossFraction ? pct(Number(s.lossFraction) * 100) : '—'}</td>
                      <td
                        className="max-w-[380px] truncate text-xs text-fg-3"
                        title={parseJson<string[]>(p.reasons, []).join('; ')}
                      >
                        {parseJson<string[]>(p.reasons, []).join('; ')}
                      </td>
                      <td className="r num text-fg-3">{ago(p.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Order history" pad={false}>
        {!orders.data ? null : orders.data.rows.length === 0 ? (
          <Empty>No paper orders yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="grid-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Token</th>
                  <th>Side · reason</th>
                  <th>Status</th>
                  <th className="r">Price</th>
                  <th className="r">USD</th>
                  <th className="r">Slippage</th>
                  <th className="r">Fee</th>
                  <th>Failure</th>
                  <th className="r">Created</th>
                </tr>
              </thead>
              <tbody>
                {orders.data.rows.map((o) => (
                  <tr key={o.id}>
                    <td className="num text-fg-3">{String(o.id).slice(-8)}</td>
                    <td>{o.symbol ?? o.mint.slice(0, 6)}</td>
                    <td>
                      <Badge tone={o.side === 'BUY' ? 'info' : 'muted'}>{o.side}</Badge>{' '}
                      <span className="text-xs text-fg-3">{label(o.reason)}</span>
                    </td>
                    <td>
                      <StateBadge state={o.status} />
                    </td>
                    <td className="r num">{price(o.price_usd)}</td>
                    <td className="r num">{usd(micro(o.usd_amount_micro))}</td>
                    <td className="r num">{o.slippage_bps ? `${num(o.slippage_bps, 1)} bp` : '—'}</td>
                    <td className="r num">{usd(micro(o.network_fee_micro), { dp: 4 })}</td>
                    <td className="max-w-[260px] truncate text-xs text-down" title={o.failure_reason ?? ''}>
                      {o.failure_reason ?? ''}
                    </td>
                    <td className="r num text-fg-3">{ago(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
