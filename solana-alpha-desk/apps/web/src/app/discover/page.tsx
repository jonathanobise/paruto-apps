'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { age, ago, DEXSCREENER, num, pct, SOLSCAN, tone, usd } from '@/lib/format';
import type { Row } from '@/lib/types';
import { Addr, Badge, Button, Empty, ErrorBox, Loading, Panel, StateBadge } from '@/components/ui';

interface View {
  name: string;
  state: string;
  q: string;
  minMcap: string;
  maxMcap: string;
  minLiq: string;
  sort: string;
  dir: 'asc' | 'desc';
}

const BUILT_IN: View[] = [
  { name: 'All', state: '', q: '', minMcap: '', maxMcap: '', minLiq: '', sort: 'discovered', dir: 'desc' },
  {
    name: 'In pipeline',
    state: 'FILTER_PENDING,FILTER_APPROVED,ANALYST_PENDING,ANALYST_APPROVED,RISK_PENDING,RISK_AUTHORIZED',
    q: '',
    minMcap: '',
    maxMcap: '',
    minLiq: '',
    sort: 'discovered',
    dir: 'desc',
  },
  {
    name: 'Rejected',
    state: 'DISCOVERY_REJECTED,FILTER_REJECTED,ANALYST_REJECTED,RISK_REJECTED,PAPER_REJECTED',
    q: '',
    minMcap: '',
    maxMcap: '',
    minLiq: '',
    sort: 'discovered',
    dir: 'desc',
  },
  {
    name: 'Unverified',
    state: 'FILTER_UNVERIFIED,FILTER_ERROR,ANALYST_UNVERIFIED',
    q: '',
    minMcap: '',
    maxMcap: '',
    minLiq: '',
    sort: 'discovered',
    dir: 'desc',
  },
  {
    name: 'Traded',
    state: 'POSITION_OPEN,EXIT_PENDING,EXIT_FAILED,POSITION_CLOSED',
    q: '',
    minMcap: '',
    maxMcap: '',
    minLiq: '',
    sort: 'discovered',
    dir: 'desc',
  },
];
const KEY = 'alpha-desk:discover-views';

function loadViews(): View[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as View[];
  } catch {
    return [];
  }
}

function Discover() {
  const params = useSearchParams();
  const initial = params.get('view') === 'rejected' ? BUILT_IN[2]! : BUILT_IN[0]!;
  const [v, setV] = useState<View>(initial);
  const [page, setPage] = useState(0);
  const [saved, setSaved] = useState<View[]>([]);
  useEffect(() => setSaved(loadViews()), []);
  const qs = new URLSearchParams({
    page: String(page),
    size: '50',
    sort: v.sort,
    dir: v.dir,
    ...(v.state ? { state: v.state } : {}),
    ...(v.q ? { q: v.q } : {}),
    ...(v.minMcap ? { minMcap: v.minMcap } : {}),
    ...(v.maxMcap ? { maxMcap: v.maxMcap } : {}),
    ...(v.minLiq ? { minLiq: v.minLiq } : {}),
  });
  const q = useQuery({
    queryKey: ['candidates', qs.toString()],
    queryFn: () => api<{ rows: Row[]; total: number; size: number }>(`/candidates?${qs}`),
    refetchInterval: 15_000,
    placeholderData: keepPreviousData,
  });
  const set = (patch: Partial<View>) => {
    setPage(0);
    setV({ ...v, ...patch, name: patch.name ?? 'Custom' });
  };
  const sortBy = (col: string) =>
    set({ sort: col, dir: v.sort === col && v.dir === 'desc' ? 'asc' : 'desc' });
  const Th = ({ col, children, r }: { col?: string; children: React.ReactNode; r?: boolean }) => (
    <th className={r ? 'r' : ''}>
      {col ? (
        <button
          onClick={() => sortBy(col)}
          className={`uppercase tracking-[0.06em] hover:text-fg ${v.sort === col ? 'text-fg' : ''}`}
        >
          {children}
          {v.sort === col ? (v.dir === 'desc' ? ' ↓' : ' ↑') : ''}
        </button>
      ) : (
        children
      )}
    </th>
  );
  const input =
    'rounded-md border border-line-strong bg-ink px-2.5 py-1.5 text-[13px] outline-none focus:border-signal';
  const now = Date.now();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {[...BUILT_IN, ...saved].map((b) => (
          <button
            key={b.name}
            onClick={() => (setPage(0), setV(b))}
            className={`rounded-full border px-3 py-1 text-xs transition ${v.name === b.name ? 'border-signal/50 bg-signal-dim/60 text-fg' : 'border-line text-fg-2 hover:text-fg'}`}
          >
            {b.name}
          </button>
        ))}
        <Button
          small
          tone="ghost"
          onClick={() => {
            const name = prompt('Save this view as');
            if (!name) return;
            const next = [...saved.filter((s) => s.name !== name), { ...v, name }];
            setSaved(next);
            try {
              localStorage.setItem(KEY, JSON.stringify(next));
            } catch {
              /* storage unavailable: the view lasts for this session only */
            }
            setV({ ...v, name });
          }}
        >
          + Save view
        </Button>
      </div>
      <Panel pad={false}>
        <div className="flex flex-wrap items-end gap-3 border-b border-line p-3">
          <label className="flex flex-col gap-1">
            <span className="label">Search</span>
            <input
              className={`${input} w-56`}
              placeholder="Symbol, name or mint"
              value={v.q}
              onChange={(e) => set({ q: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">Min mcap</span>
            <input
              className={`${input} num w-28`}
              inputMode="numeric"
              value={v.minMcap}
              onChange={(e) => set({ minMcap: e.target.value })}
              placeholder="any"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">Max mcap</span>
            <input
              className={`${input} num w-28`}
              inputMode="numeric"
              value={v.maxMcap}
              onChange={(e) => set({ maxMcap: e.target.value })}
              placeholder="any"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">Min liquidity</span>
            <input
              className={`${input} num w-28`}
              inputMode="numeric"
              value={v.minLiq}
              onChange={(e) => set({ minLiq: e.target.value })}
              placeholder="any"
            />
          </label>
          <div className="ml-auto flex items-center gap-2 text-xs text-fg-3">
            <span className="num">{q.data ? `${num(q.data.total)} runs` : ''}</span>
            <Button small disabled={page === 0} onClick={() => setPage(page - 1)}>
              ←
            </Button>
            <span className="num">page {page + 1}</span>
            <Button
              small
              disabled={!q.data || (page + 1) * q.data.size >= q.data.total}
              onClick={() => setPage(page + 1)}
            >
              →
            </Button>
          </div>
        </div>
        <ErrorBox error={q.error} />
        {!q.data ? (
          <div className="p-4">
            <Loading />
          </div>
        ) : q.data.rows.length === 0 ? (
          <Empty>No candidates match. Discovery runs every minute while the monitor is running.</Empty>
        ) : (
          <div className="max-h-[70vh] overflow-auto">
            <table className="grid-table">
              <thead>
                <tr>
                  <Th col="symbol">Symbol</Th>
                  <Th>Mint</Th>
                  <Th col="age">Age</Th>
                  <Th>DEX</Th>
                  <Th col="mcap" r>
                    Mcap
                  </Th>
                  <Th col="liquidity" r>
                    Liquidity
                  </Th>
                  <Th col="volume" r>
                    1h vol
                  </Th>
                  <Th col="change" r>
                    1h
                  </Th>
                  <Th>Security · state</Th>
                  <Th col="score" r>
                    Score
                  </Th>
                  <Th col="discovered" r>
                    Seen
                  </Th>
                  <Th>Links</Th>
                </tr>
              </thead>
              <tbody>
                {q.data.rows.map((r) => {
                  const codes = JSON.parse(r.rejection_codes || '[]') as string[];
                  return (
                    <tr key={r.id}>
                      <td>
                        <Link href={`/token/?mint=${r.mint}`} className="font-medium hover:text-signal">
                          {r.symbol ?? '—'}
                        </Link>
                        <div className="max-w-[140px] truncate text-[11px] text-fg-3">{r.name}</div>
                      </td>
                      <td>
                        <Addr value={r.mint} href={SOLSCAN(r.mint)} />
                      </td>
                      <td
                        className="num"
                        title={
                          r.earliest_pool_at && r.earliest_pool_at !== r.pair_created_at
                            ? `earliest pool ${age(r.earliest_pool_at, now)} ago`
                            : undefined
                        }
                      >
                        {age(r.pair_created_at, now)}
                        {r.earliest_pool_at &&
                        r.pair_created_at &&
                        r.earliest_pool_at < r.pair_created_at - 60_000 ? (
                          <span className="ml-1 text-warn">↺</span>
                        ) : null}
                      </td>
                      <td className="text-fg-2">
                        {r.dex_id}
                        {r.pool_type && !String(r.pool_type).includes(',') ? (
                          <span className="text-fg-3">
                            {' '}
                            · {String(r.pool_type).replace('UNSUPPORTED:', '✕ ')}
                          </span>
                        ) : null}
                      </td>
                      <td className="r num">{usd(r.market_cap_usd, { compact: true })}</td>
                      <td className="r num">{usd(r.liquidity_usd, { compact: true })}</td>
                      <td className="r num">{usd(r.volume_1h_usd, { compact: true })}</td>
                      <td
                        className={`r num ${tone(r.price_change_1h_pct === null ? null : Number(r.price_change_1h_pct))}`}
                      >
                        {pct(r.price_change_1h_pct, { sign: true, dp: 1 })}
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <StateBadge state={r.state} />
                          {codes.length > 0 && (
                            <span
                              className="num max-w-[180px] truncate text-[11px] text-fg-3"
                              title={codes.join(', ')}
                            >
                              {codes.slice(0, 3).join(' ')}
                              {codes.length > 3 ? ` +${codes.length - 3}` : ''}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="r num">{r.analyst_score ? Number(r.analyst_score).toFixed(1) : '—'}</td>
                      <td className="r num text-fg-3" title={new Date(r.discovered_at).toISOString()}>
                        {ago(r.discovered_at, now)}
                      </td>
                      <td>
                        <div className="flex gap-2 text-[11px]">
                          <a
                            className="text-fg-3 hover:text-signal"
                            href={DEXSCREENER(r.pair_address)}
                            target="_blank"
                            rel="noreferrer noopener"
                          >
                            DexScreener
                          </a>
                          <a
                            className="text-fg-3 hover:text-signal"
                            href={SOLSCAN(r.pair_address, 'account')}
                            target="_blank"
                            rel="noreferrer noopener"
                          >
                            Pool
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <p className="text-xs text-fg-3">
        Market values are DexScreener observations at discovery time; ↺ marks a token whose earliest pool
        predates the traded pool (possible relaunch). <Badge tone="info">ACTUAL</Badge> observations, not
        estimates.
      </p>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <Discover />
    </Suspense>
  );
}
