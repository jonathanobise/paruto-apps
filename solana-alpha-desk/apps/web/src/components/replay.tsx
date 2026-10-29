'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ago, pct, tone, usd } from '@/lib/format';
import type { Row } from '@/lib/types';
import { Badge, Button, Empty, ErrorBox, Panel } from './ui';

/** Historical replay and walk-forward runs of the active strategy over recorded observations. */
export function ReplayPanel() {
  const qc = useQueryClient();
  const runs = useQuery({ queryKey: ['replay'], queryFn: () => api<{ rows: Row[] }>('/replay') });
  const [days, setDays] = useState('7');
  const [mode, setMode] = useState<'RECORDED' | 'MARKET_RULES_ONLY'>('RECORDED');
  const [folds, setFolds] = useState<'split' | 'walk'>('split');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const latest = runs.data?.rows[0];
  const input =
    'rounded-md border border-line-strong bg-ink px-2.5 py-1.5 text-[13px] outline-none focus:border-signal';
  const rows: Array<{ name: string; r: Row }> = latest
    ? [
        { name: 'Whole period', r: latest.result.whole },
        ...(latest.result.folds as Row[]).map((f) => ({ name: f.name, r: f.result })),
      ]
    : [];
  return (
    <Panel title="Historical replay · walk-forward" right={<Badge tone="warn">REPLAY ESTIMATE</Badge>}>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="label">Days back</span>
          <input
            className={`${input} num w-20`}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            inputMode="numeric"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Eligibility</span>
          <select className={input} value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
            <option value="RECORDED">Recorded Filter decisions</option>
            <option value="MARKET_RULES_ONLY">Market rules only (research)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Evaluation</span>
          <select className={input} value={folds} onChange={(e) => setFolds(e.target.value as typeof folds)}>
            <option value="split">Development / validation / test</option>
            <option value="walk">Walk-forward (4 windows)</option>
          </select>
        </label>
        <Button
          tone="primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setErr(null);
            try {
              const end = Date.now();
              await api('/replay/run', {
                method: 'POST',
                body: {
                  start: end - Number(days) * 86_400_000,
                  end,
                  filterMode: mode,
                  folds,
                  walkWindows: 4,
                },
              });
              await qc.invalidateQueries({ queryKey: ['replay'] });
            } catch (e) {
              setErr(e);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? 'Replaying…' : 'Run replay'}
        </Button>
      </div>
      <div className="mt-3">
        <ErrorBox error={err} />
      </div>
      {!latest ? (
        <Empty>No replay has been run. Replays use only data that was recorded at each decision time.</Empty>
      ) : (
        <>
          <div className="mt-4 text-xs text-fg-3">
            Latest run {ago(latest.created_at)} · {latest.filter_mode} · config{' '}
            <span className="num">{latest.config_version}</span>
          </div>
          <div className="mt-2 overflow-x-auto">
            <table className="grid-table">
              <thead>
                <tr>
                  <th>Fold</th>
                  <th className="r">Observations</th>
                  <th className="r">Eligible</th>
                  <th className="r">Approved</th>
                  <th className="r">Trades</th>
                  <th className="r">Win rate</th>
                  <th className="r">Expectancy</th>
                  <th className="r">Net</th>
                  <th className="r">Max DD</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ name, r }) => (
                  <tr key={name}>
                    <td className="capitalize">{name}</td>
                    <td className="r num">{r.observations}</td>
                    <td className="r num">{r.decisions.eligible}</td>
                    <td className="r num">{r.decisions.approved}</td>
                    <td className="r num">{r.metrics.trades}</td>
                    <td className="r num">{pct(r.metrics.winRatePct)}</td>
                    <td className={`r num ${tone(Number(r.metrics.expectancyUsd))}`}>
                      {usd(r.metrics.expectancyUsd, { sign: true })}
                    </td>
                    <td className={`r num ${tone(Number(r.metrics.netPnlUsd))}`}>
                      {usd(r.metrics.netPnlUsd, { sign: true })}
                    </td>
                    <td className="r num">{pct(r.metrics.maxDrawdownPct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-fg-3">
            {(latest.result.whole.notes as string[]).map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}
