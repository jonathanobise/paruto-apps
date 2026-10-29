'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ago, pct, price, usd } from '@/lib/format';
import type { Row } from '@/lib/types';
import {
  Badge,
  Bar,
  Button,
  Confirm,
  Empty,
  ErrorBox,
  KV,
  Loading,
  Panel,
  Prov,
  Stat,
  StateBadge,
  label,
} from '@/components/ui';

export default function Risk() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['risk'], queryFn: () => api<Row>('/risk'), refetchInterval: 5_000 });
  if (q.error) return <ErrorBox error={q.error} />;
  if (!q.data) return <Loading />;
  const d = q.data;
  const lim = d.limits as Row;
  const tripped = (d.breakers as Row[]).filter((b) => b.tripped);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat
          label="Exposure"
          prov="PAPER"
          value={pct(d.exposurePct)}
          sub={`${usd(d.exposureUsd)} of ${usd(d.equityUsd)}`}
        />
        <Stat
          label="Capacity left"
          prov="PAPER"
          value={usd(d.remainingCapacityUsd)}
          sub={`cap ${lim.maxCombinedExposurePct}% of equity`}
        />
        <Stat
          label="Positions"
          value={`${d.openPositions} / ${d.maxConcurrent}`}
          sub={`max ${lim.maxAllocationPct}% each · ${usd(d.maxAllocationUsd)}`}
        />
        <Stat
          label="To stops"
          prov="ESTIMATE"
          value={usd(d.estimatedDownsideUsd)}
          sub="a trigger, not a floor"
        />
        <Stat
          label="Drawdown"
          prov="PAPER"
          value={pct(d.drawdownPct)}
          sub={`shutdown at ${lim.maxDrawdownPct}%`}
          toneClass={Number(d.drawdownPct) > lim.maxDrawdownPct * 0.6 ? 'text-warn' : ''}
        />
        <Stat
          label="Today"
          prov="PAPER"
          value={pct(d.dailyPnlPct, { sign: true })}
          sub={`breaker at −${lim.dailyLossLimitPct}%`}
          toneClass={Number(d.dailyPnlPct) < 0 ? 'text-down' : ''}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Panel
          title="Circuit breakers"
          right={
            tripped.length ? (
              <Badge tone="down">{tripped.length} tripped</Badge>
            ) : (
              <Badge tone="up">all clear</Badge>
            )
          }
          pad={false}
        >
          <table className="grid-table">
            <tbody>
              {(d.breakerCatalogue as Row[]).map((c) => {
                const b = (d.breakers as Row[]).find((x) => x.breaker === c.breaker && x.tripped);
                return (
                  <tr key={c.breaker}>
                    <td>{label(c.breaker)}</td>
                    <td>{b ? <StateBadge state="TRIPPED" /> : <Badge tone="up">armed</Badge>}</td>
                    <td className="max-w-[360px] whitespace-normal text-xs text-fg-3">
                      {b ? `${b.detail} · ${ago(b.tripped_at)}` : ''}
                    </td>
                    <td className="r">
                      {b && (
                        <Confirm
                          title={`Reset ${label(c.breaker)}`}
                          body={
                            <>
                              Follows the documented reset procedure. The condition that tripped it must have
                              cleared
                              {c.breaker === 'DAILY_LOSS'
                                ? ', and a daily-loss breaker only resets on a new trading day'
                                : ''}
                              .
                            </>
                          }
                          phrase={c.resetPhrase}
                          tone="primary"
                          onConfirm={async (reason, typed) => {
                            await api(`/control/breakers/${c.breaker}/reset`, {
                              method: 'POST',
                              body: { phrase: typed, reason },
                            });
                            await qc.invalidateQueries();
                          }}
                          trigger={(open) => (
                            <Button small onClick={open}>
                              Reset…
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
        </Panel>
        <Panel title="Limits in force" right={<Prov kind="ACTUAL" />}>
          <KV
            rows={[
              ['Allocation per trade', `${lim.maxAllocationPct}% · ${usd(d.maxAllocationUsd)}`],
              ['Risk budget per trade', `${lim.riskBudgetPct}% · ${usd(d.riskBudgetUsd)}`],
              ['Combined exposure', `${lim.maxCombinedExposurePct}%`],
              ['Concurrent positions', lim.maxConcurrentPositions],
              ['Initial stop', `−${lim.initialStopPct}% of entry reference`],
              ['Trailing', `from +${lim.trailingActivationPct}%, ${lim.trailingDistancePct}% below high`],
              ['Execution buffer', `${lim.executionBufferPct}%`],
              ['Max entry cost', `${lim.maxEntryCostPct}%`],
              ['Authorization TTL', `${lim.authorizationTtlSeconds}s, single use`],
              ['Daily trades', lim.maxDailyTrades],
              ['Entries paused', d.entriesPausedReason ?? 'no'],
            ]}
          />
        </Panel>
      </div>

      <Panel title="Stops and marks" pad={false}>
        {(d.positions as Row[]).length === 0 ? (
          <Empty>No open positions.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="grid-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Status</th>
                  <th className="r">Value</th>
                  <th className="r">Mark</th>
                  <th className="r">Stop</th>
                  <th className="r">Downside to stop</th>
                  <th>Trailing</th>
                  <th className="r">Quote age</th>
                </tr>
              </thead>
              <tbody>
                {(d.positions as Row[]).map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link className="hover:text-signal" href={`/position/?id=${p.id}`}>
                        {p.symbol}
                      </Link>
                    </td>
                    <td>
                      <StateBadge state={p.status} />
                    </td>
                    <td className="r num">{usd(p.valueUsd)}</td>
                    <td className="r num">{price(p.markUsd)}</td>
                    <td className="r num">{price(p.stopUsd)}</td>
                    <td className="r num">{usd(p.downsideToStopUsd)}</td>
                    <td>{p.trailingActive ? <Badge tone="up">active</Badge> : <Badge>inactive</Badge>}</td>
                    <td
                      className={`r num ${p.markAgeS !== null && p.markAgeS > 20 ? 'text-warn' : 'text-fg-3'}`}
                    >
                      {p.markAgeS === null ? '—' : `${p.markAgeS}s`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {d.largest && (
          <div className="border-t border-line px-4 py-3 text-xs text-fg-3">
            Largest position: {d.largest.symbol} at {usd(d.largest.valueUsd)}
            <div className="mt-2 max-w-sm">
              <Bar value={Number(d.largest.valueUsd ?? 0)} max={Number(d.maxAllocationUsd)} tone="warn" />
            </div>
          </div>
        )}
      </Panel>

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel title="Data feeds · 15 min" pad={false}>
          {(d.outages as Row[]).length === 0 ? (
            <Empty>No provider calls in the last 15 minutes.</Empty>
          ) : (
            <table className="grid-table">
              <tbody>
                {(d.outages as Row[]).map((o) => (
                  <tr key={o.provider_id}>
                    <td>{o.provider_id}</td>
                    <td className="r num">{o.calls} calls</td>
                    <td
                      className={`r num ${Number(o.errors) / Math.max(1, Number(o.calls)) > 0.3 ? 'text-down' : Number(o.errors) ? 'text-warn' : 'text-fg-3'}`}
                    >
                      {o.errors} err
                    </td>
                    <td className="r num text-fg-3">{ago(o.last_ok)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        <Panel title="Route failures · 24h" pad={false}>
          {(d.routeFailures as Row[]).length === 0 ? (
            <Empty>No failed paper orders.</Empty>
          ) : (
            <table className="grid-table">
              <tbody>
                {(d.routeFailures as Row[]).map((f) => (
                  <tr key={f.id}>
                    <td>{f.symbol}</td>
                    <td>{f.side}</td>
                    <td className="max-w-[220px] truncate text-xs text-fg-3" title={f.failure_reason}>
                      {f.failure_reason}
                    </td>
                    <td className="r num text-fg-3">{ago(f.resolved_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        <Panel title="Liquidity warnings · 24h" pad={false}>
          {(d.liquidityWarnings as Row[]).length === 0 ? (
            <Empty>None.</Empty>
          ) : (
            <table className="grid-table">
              <tbody>
                {(d.liquidityWarnings as Row[]).map((w, i) => (
                  <tr key={i}>
                    <td className="max-w-[260px] whitespace-normal text-xs">{w.detail}</td>
                    <td className="r num text-fg-3">{ago(w.created_at)}</td>
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
