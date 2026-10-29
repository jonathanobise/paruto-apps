'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { dt, micro, num, parseJson, pct, price, tone, usd } from '@/lib/format';
import type { Row } from '@/lib/types';
import { Empty, ErrorBox, Loading, Panel, Prov, StateBadge, label } from '@/components/ui';

export default function Journal() {
  const q = useQuery({
    queryKey: ['journal'],
    queryFn: () => api<{ rows: Row[] }>('/journal'),
    refetchInterval: 20_000,
  });
  if (q.error) return <ErrorBox error={q.error} />;
  if (!q.data) return <Loading />;
  if (q.data.rows.length === 0)
    return (
      <Panel title="Trade journal">
        <Empty>
          No paper trades yet. Every trade will appear here with its rationale, evidence, costs and outcome.
        </Empty>
      </Panel>
    );
  return (
    <div className="space-y-4">
      {q.data.rows.map((t) => {
        const pnl = micro(t.realized_pnl_micro);
        const risk = micro(t.planned_risk_micro);
        const entryRef = Number(t.entry_reference_price_usd);
        const mfe = entryRef ? (Number(t.highest_reference_usd) / entryRef - 1) * 100 : null;
        const mae = entryRef ? (Number(t.lowest_reference_usd) / entryRef - 1) * 100 : null;
        const sec = parseJson<Row>(t.security_summary, {});
        const sizing = parseJson<Row>(t.sizing, {});
        const duration = t.exit_at ? (t.exit_at - t.entry_at) / 60000 : null;
        return (
          <Panel
            key={t.id}
            title={
              <span className="flex items-center gap-2">
                <Link href={`/position/?id=${t.id}`} className="hover:text-signal">
                  {t.symbol ?? t.mint.slice(0, 6)}
                </Link>
                <StateBadge state={t.status} />
                <Prov kind="PAPER" />
              </span>
            }
            right={<span className="num">{dt(t.entry_at)}</span>}
          >
            <div className="grid gap-5 lg:grid-cols-[1fr_1fr_1.2fr]">
              <div className="space-y-1.5 text-[13px]">
                <div className="label mb-2">Outcome</div>
                <div className={`num text-xl ${tone(pnl)}`}>
                  {t.status === 'CLOSED' ? usd(pnl, { sign: true }) : 'open'}
                </div>
                <div className="num text-fg-3">
                  R {pnl !== null && risk ? (pnl / risk).toFixed(2) : '—'} ·{' '}
                  {duration === null ? '—' : `${num(duration, 0)} min`} · exit {label(t.exit_reason)}
                </div>
                <div className="num text-fg-3">
                  MFE {pct(mfe, { sign: true })} · MAE {pct(mae, { sign: true })}
                </div>
              </div>
              <div className="space-y-1.5 text-[13px]">
                <div className="label mb-2">Execution</div>
                <div className="num text-fg-2">
                  entry {price(t.entry_price_usd)} → exit {price(t.exit_price_usd)}
                </div>
                <div className="num text-fg-3">
                  slippage {t.entry_slippage_bps ? `${num(t.entry_slippage_bps, 1)}bp` : '—'} in ·{' '}
                  {t.exit_slippage_bps ? `${num(t.exit_slippage_bps, 1)}bp` : '—'} out
                </div>
                <div className="num text-fg-3">
                  fees {usd((micro(t.entry_fees_micro) ?? 0) + (micro(t.exit_fees_micro) ?? 0), { dp: 4 })} ·
                  cost {usd(micro(t.entry_cost_micro))}
                </div>
                <div className="num text-fg-3">strategy {t.strategy_version}</div>
              </div>
              <div className="space-y-1.5 text-[13px]">
                <div className="label mb-2">Why it was taken</div>
                <div className="text-fg-2">
                  Filter approved on {sec.poolType ?? 'a verified pool'} (LP{' '}
                  {sec.lpNonWithdrawablePct ? pct(sec.lpNonWithdrawablePct, { dp: 1 }) : '—'}{' '}
                  non-withdrawable, sell impact {sec.sellImpactPct ? pct(sec.sellImpactPct) : '—'}); Analyst
                  score {t.analyst_score ? Number(t.analyst_score).toFixed(1) : '—'}.
                </div>
                <div className="text-xs text-fg-3">
                  {parseJson<string[]>(t.analyst_reasons, []).join(' · ')}
                </div>
                <div className="text-xs text-fg-3">
                  Sized by {sizing.binding ? String(sizing.binding).replace('Micro', '') : '—'}; est. costs{' '}
                  {pct(sizing.entryCostPct)} in / {pct(sizing.exitCostPct)} out.{' '}
                  <Link className="underline" href={`/token/?mint=${t.mint}`}>
                    Evidence →
                  </Link>
                </div>
              </div>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
