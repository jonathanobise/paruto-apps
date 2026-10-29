'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { age, ago, DEXSCREENER, dt, num, parseJson, pct, price, SOLSCAN, tone, usd } from '@/lib/format';
import type { Row } from '@/lib/types';
import { TimeChart } from '@/components/chart';
import {
  Addr,
  Badge,
  Bar,
  Button,
  Empty,
  ErrorBox,
  KV,
  Loading,
  Panel,
  Prov,
  StateBadge,
  label,
  stateTone,
} from '@/components/ui';

function Search() {
  const router = useRouter();
  const [mint, setMint] = useState('');
  const recent = useQuery({
    queryKey: ['candidates', 'recent-filtered'],
    queryFn: () =>
      api<{ rows: Row[] }>(
        '/candidates?size=20&state=FILTER_APPROVED,FILTER_REJECTED,FILTER_UNVERIFIED,FILTER_ERROR,ANALYST_APPROVED,ANALYST_REJECTED,ANALYST_UNVERIFIED,RISK_REJECTED,RISK_PAUSED,POSITION_OPEN,POSITION_CLOSED,EXPIRED',
      ),
  });
  return (
    <div className="space-y-4">
      <Panel title="Look up a token">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (mint.trim()) router.push(`/token/?mint=${mint.trim()}`);
          }}
        >
          <input
            value={mint}
            onChange={(e) => setMint(e.target.value)}
            placeholder="Mint address"
            className="num w-full max-w-xl rounded-md border border-line-strong bg-ink px-3 py-2 text-[13px] outline-none focus:border-signal"
          />
          <Button type="submit" tone="primary">
            Open
          </Button>
        </form>
      </Panel>
      <Panel title="Recently assessed by the Filter" pad={false}>
        {!recent.data ? (
          <div className="p-4">
            <Loading />
          </div>
        ) : recent.data.rows.length === 0 ? (
          <Empty>No token has reached the Filter yet.</Empty>
        ) : (
          <table className="grid-table">
            <tbody>
              {recent.data.rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link className="font-medium hover:text-signal" href={`/token/?mint=${r.mint}`}>
                      {r.symbol}
                    </Link>
                  </td>
                  <td>
                    <Addr value={r.mint} />
                  </td>
                  <td>
                    <StateBadge state={r.state} />
                  </td>
                  <td className="r num text-fg-3">{ago(r.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}

function Intelligence({ mint }: { mint: string }) {
  const q = useQuery({
    queryKey: ['token', mint],
    queryFn: () => api<Row>(`/tokens/${mint}`),
    refetchInterval: 15_000,
  });
  const [evidence, setEvidence] = useState<string | null>(null);
  const series = useMemo(
    () =>
      ((q.data?.snapshots as Row[] | undefined) ?? [])
        .filter((s) => s.price_usd)
        .map((s) => ({ at: s.observed_at as number, value: Number(s.price_usd) })),
    [q.data],
  );
  if (q.error) return <ErrorBox error={q.error} />;
  if (!q.data) return <Loading />;
  const d = q.data;
  const t = d.token as Row;
  const run = (d.runs as Row[])[0];
  const snap = (d.snapshots as Row[]).at(-1);
  const summary = parseJson<Row>(d.assessment?.summary, {});
  const holders = d.holders as Row | null;
  const classified = parseJson<Array<{ a: string; o: string | null; c: string; amt: string }>>(
    holders?.classification,
    [],
  );
  const dev = d.developer as Row | null;
  const devFindings = parseJson<Row>(dev?.findings, {});
  const bundle = d.bundle as Row | null;
  const bundleFindings = parseJson<Row>(bundle?.findings, {});
  const supply = holders ? Number(holders.total_supply) : 0;
  const rejections = (d.rules as Row[]).filter((r) => r.outcome !== 'PASS' && r.outcome !== 'NOT_REQUIRED');
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">{t.symbol ?? 'Unknown'}</h2>
            <span className="text-fg-3">{t.name}</span>
            {run && <StateBadge state={run.state} />}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-fg-3">
            <span className="num">{mint}</span>
            <a className="hover:text-signal" href={SOLSCAN(mint)} target="_blank" rel="noreferrer noopener">
              Solscan ↗
            </a>
            {run && (
              <a
                className="hover:text-signal"
                href={DEXSCREENER(run.pair_address)}
                target="_blank"
                rel="noreferrer noopener"
              >
                DexScreener ↗
              </a>
            )}
          </div>
        </div>
        <div className="ml-auto text-right text-xs text-fg-3">
          {run?.filter_status === 'FILTER_APPROVED' ? (
            <Badge tone="up">ELIGIBLE · FILTER APPROVED</Badge>
          ) : (
            <span>Passing the Filter makes a token eligible, never “safe”.</span>
          )}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Panel
          title="Price history"
          right={
            <>
              <Prov kind="ACTUAL" /> our DexScreener snapshots
            </>
          }
        >
          {series.length < 2 ? (
            <Empty>Fewer than two snapshots recorded for this token.</Empty>
          ) : (
            <TimeChart points={series} height={260} />
          )}
        </Panel>
        <Panel
          title="Market summary"
          right={
            <>
              <Prov kind="ACTUAL" /> {snap ? ago(snap.observed_at) : ''}
            </>
          }
        >
          <KV
            rows={[
              ['Price', price(snap?.price_usd)],
              ['Market cap', usd(snap?.market_cap_usd ?? run?.market_cap_usd, { compact: true })],
              ['FDV', usd(run?.fdv_usd, { compact: true })],
              ['Liquidity (provider)', usd(snap?.liquidity_usd ?? run?.liquidity_usd, { compact: true })],
              ['Liquidity (on-chain)', usd(summary.onChainLiquidityUsd, { compact: true })],
              ['1h volume', usd(snap?.volume_h1 ?? run?.volume_1h_usd, { compact: true })],
              [
                '1h change',
                <span key="c" className={tone(Number(snap?.change_h1 ?? run?.price_change_1h_pct))}>
                  {pct(snap?.change_h1 ?? run?.price_change_1h_pct, { sign: true })}
                </span>,
              ],
              ['1h buys / sells (count)', snap ? `${num(snap.buys_h1)} / ${num(snap.sells_h1)}` : '—'],
              ['Pool age', age(run?.pair_created_at)],
              ['Earliest known pool', run?.earliest_pool_at ? `${age(run.earliest_pool_at)} ago` : '—'],
              [
                'Token program',
                summary.tokenProgram
                  ? String(summary.tokenProgram).startsWith('Tokenz')
                    ? 'Token-2022'
                    : 'SPL Token'
                  : '—',
              ],
            ]}
          />
        </Panel>
      </div>

      {rejections.length > 0 && (
        <Panel title="Why this token is blocked">
          <ul className="space-y-1.5 text-[13px]">
            {rejections.map((r) => (
              <li key={r.rule_id} className="flex gap-2">
                <StateBadge state={r.outcome} />
                <span className="num text-fg-3">{r.rule_id}</span>
                <span className="text-fg-2">{r.reason}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel
        title="Security checks · rule-by-rule evidence"
        right={
          d.assessment ? (
            <>
              assessed {ago(d.assessment.completed_at)} · config{' '}
              {String(d.assessment.config_version).slice(0, 12)}
            </>
          ) : null
        }
        pad={false}
      >
        {(d.rules as Row[]).length === 0 ? (
          <Empty>The Filter has not assessed this token.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="grid-table">
              <thead>
                <tr>
                  <th>Rule</th>
                  <th>Check</th>
                  <th>Outcome</th>
                  <th>Finding</th>
                  <th>Threshold</th>
                  <th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {(d.rules as Row[]).map((r) => (
                  <tr key={r.rule_id}>
                    <td className="num text-fg-3">{r.rule_id}</td>
                    <td>{r.title}</td>
                    <td>
                      <StateBadge state={r.outcome} />
                    </td>
                    <td className="max-w-[460px] whitespace-normal text-fg-2">{r.reason}</td>
                    <td className="num text-fg-3">{r.threshold ?? '—'}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {parseJson<string[]>(r.evidence_ids, [])
                          .slice(0, 4)
                          .map((id) => (
                            <button
                              key={id}
                              onClick={() => setEvidence(id)}
                              className="num rounded border border-line px-1 text-[10px] text-fg-3 hover:border-signal hover:text-signal"
                            >
                              {id.slice(-6)}
                            </button>
                          ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {evidence && <EvidenceViewer id={evidence} onClose={() => setEvidence(null)} />}

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel title="Pool structure & liquidity">
          <KV
            rows={[
              [
                'Traded pool',
                run ? (
                  <Addr key="p" value={run.pair_address} href={SOLSCAN(run.pair_address, 'account')} />
                ) : (
                  '—'
                ),
              ],
              [
                'Pool type',
                summary.poolType ?? (
                  <span key="u" className="text-warn">
                    no verified adapter
                  </span>
                ),
              ],
              [
                'Quote',
                summary.quoteMint ? (
                  summary.quoteMint.startsWith('So111') ? (
                    'SOL'
                  ) : summary.quoteMint.startsWith('EPjF') ? (
                    'USDC'
                  ) : (
                    <Addr key="q" value={summary.quoteMint} />
                  )
                ) : (
                  '—'
                ),
              ],
              ['LP non-withdrawable', summary.lpNonWithdrawablePct ? pct(summary.lpNonWithdrawablePct) : '—'],
              ['Sell impact (max position)', summary.sellImpactPct ? pct(summary.sellImpactPct) : '—'],
              ['Executable sell price', price(summary.sizedSellPriceUsd)],
              ['Known pools', String((d.pools as Row[]).length)],
            ]}
          />
          <div className="mt-3 space-y-1 text-xs text-fg-3">
            {(d.pools as Row[]).map((p) => (
              <div key={p.pair_address} className="flex justify-between gap-2">
                <span>
                  {p.dex_id} {p.pool_type ? `· ${p.pool_type}` : ''}
                </span>
                <span className="num">{age(p.pair_created_at)}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Developer associations">
          {!dev ? (
            <Empty>No developer analysis.</Empty>
          ) : (
            <>
              <KV
                rows={[
                  ['Status', <StateBadge key="s" state={dev.status} />],
                  [
                    'Deployer',
                    <Addr
                      key="d"
                      value={dev.deployer}
                      href={dev.deployer ? SOLSCAN(dev.deployer, 'account') : undefined}
                    />,
                  ],
                  ['Source', devFindings.source ?? '—'],
                  [
                    'Developer-linked ownership',
                    dev.developer_ownership_pct ? pct(dev.developer_ownership_pct) : '—',
                  ],
                  ['Linked wallets', String(parseJson<unknown[]>(dev.linked_wallets, []).length)],
                  ['Prior tokens', dev.prior_tokens ?? '—'],
                  ['Confirmed rugs', dev.confirmed_rugs ?? '—'],
                ]}
              />
              {(devFindings.notes as string[] | undefined)?.length ? (
                <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-fg-3">
                  {(devFindings.notes as string[]).map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </Panel>
        <Panel title="Launch behaviour">
          {!bundle ? (
            <Empty>No launch analysis.</Empty>
          ) : (
            <>
              <KV
                rows={[
                  ['Status', <StateBadge key="s" state={bundle.status} />],
                  ['Launch window', `${bundle.window_seconds}s`],
                  ['Coordinated acquisition', bundle.bundled_pct ? pct(bundle.bundled_pct) : '—'],
                  ['Linked buyers', bundle.linked_buyers ?? '—'],
                ]}
              />
              {(bundleFindings.notes as string[] | undefined)?.length ? (
                <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-fg-3">
                  {(bundleFindings.notes as string[]).map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <Panel
          title="Holder concentration"
          right={holders ? <>{ago(holders.observed_at)} · top 20 accounts</> : null}
          pad={false}
        >
          {!holders ? (
            <Empty>No holder snapshot (requires getTokenLargestAccounts from an RPC that permits it).</Empty>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 border-b border-line p-4 text-[13px]">
                <div>
                  <div className="label">Top-10 lower bound</div>
                  <div className="num mt-1 text-lg">{pct(holders.top10_pct_lower_bound)}</div>
                </div>
                <div>
                  <div className="label">Top-10 clustered</div>
                  <div className="num mt-1 text-lg">
                    {holders.top10_pct_clustered ? (
                      pct(holders.top10_pct_clustered)
                    ) : (
                      <span className="text-warn">unverified</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="label">Circulating</div>
                  <div className="num mt-1 text-lg">
                    {supply ? pct((Number(holders.circulating_supply) / supply) * 100, { dp: 1 }) : '—'}
                  </div>
                </div>
              </div>
              <div className="max-h-72 overflow-auto">
                <table className="grid-table">
                  <thead>
                    <tr>
                      <th>Controller</th>
                      <th>Class</th>
                      <th className="r">Share of supply</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classified.map((h) => (
                      <tr key={h.a}>
                        <td>
                          <Addr value={h.o ?? h.a} href={SOLSCAN(h.o ?? h.a, 'account')} />
                        </td>
                        <td>
                          <Badge
                            tone={
                              h.c === 'INDIVIDUAL'
                                ? 'muted'
                                : h.c === 'DEVELOPER'
                                  ? 'down'
                                  : h.c === 'UNKNOWN' || h.c === 'ESCROW_OR_PROGRAM'
                                    ? 'warn'
                                    : 'info'
                            }
                          >
                            {label(h.c)}
                          </Badge>
                        </td>
                        <td className="r num">
                          {supply ? pct((Number(h.amt) / supply) * 100, { dp: 3 }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Panel>
        <Panel
          title="Analyst score"
          right={
            d.score ? (
              <>
                <Prov kind="ACTUAL" /> {ago(d.score.scored_at)}
              </>
            ) : null
          }
        >
          {!d.score ? (
            <Empty>Not scored — only Filter-approved tokens reach the Analyst.</Empty>
          ) : (
            <>
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <div className="num text-3xl font-medium">{Number(d.score.total_score).toFixed(1)}</div>
                  <div className="text-xs text-fg-3">
                    of 100 · pass at 70 · verified weight {d.score.verified_weight}
                  </div>
                </div>
                <StateBadge state={d.score.outcome} />
              </div>
              <div className="space-y-3">
                {(d.factors as Row[]).map((f) => (
                  <div key={f.factor}>
                    <div className="mb-1 flex items-center justify-between text-[13px]">
                      <span>
                        {label(f.factor.replace(/([A-Z])/g, '_$1').toUpperCase())}{' '}
                        <span className="text-fg-3">· {f.version}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <Badge tone={stateTone(f.data_quality)}>{f.data_quality}</Badge>
                        <span className="num w-16 text-right">
                          {Number(f.factor_score).toFixed(1)} / {Number(f.weight)}
                        </span>
                      </span>
                    </div>
                    <Bar
                      value={Number(f.factor_score)}
                      max={Number(f.weight)}
                      tone={f.data_quality === 'VERIFIED' ? 'signal' : 'warn'}
                    />
                    <div className="num mt-1 truncate text-[11px] text-fg-3" title={f.evidence}>
                      raw {f.raw_metric ?? '—'}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-fg-3">
                {parseJson<string[]>(d.score.reasons, []).join(' · ')}
              </div>
            </>
          )}
        </Panel>
      </div>

      {(d.holderCounts as Row[]).length > 1 && (
        <Panel title="Holder growth" right={<Prov kind="ACTUAL" />}>
          <TimeChart
            points={(d.holderCounts as Row[]).map((h) => ({ at: h.observed_at, value: h.holder_count }))}
            height={180}
            kind="line"
            color="#35c48f"
          />
        </Panel>
      )}

      <Panel title="Evaluation runs" pad={false}>
        <table className="grid-table">
          <thead>
            <tr>
              <th>Run</th>
              <th>State</th>
              <th>Reasons</th>
              <th className="r">Score</th>
              <th className="r">Discovered</th>
            </tr>
          </thead>
          <tbody>
            {(d.runs as Row[]).map((r) => (
              <tr key={r.id}>
                <td className="num text-fg-3">{String(r.id).slice(-10)}</td>
                <td>
                  <StateBadge state={r.state} />
                </td>
                <td className="num max-w-[420px] truncate text-xs text-fg-3">
                  {parseJson<string[]>(r.rejection_codes, []).join(' · ') || '—'}
                </td>
                <td className="r num">{r.analyst_score ? Number(r.analyst_score).toFixed(1) : '—'}</td>
                <td className="r num text-fg-3">{dt(r.discovered_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

function EvidenceViewer({ id, onClose }: { id: string; onClose: () => void }) {
  const q = useQuery({ queryKey: ['evidence', id], queryFn: () => api<Row>(`/evidence/${id}`) });
  let pretty = q.data?.raw as string | null;
  try {
    if (pretty) pretty = JSON.stringify(JSON.parse(pretty), null, 2);
  } catch {
    /* not JSON: show as stored */
  }
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Evidence"
    >
      <div className="panel flex max-h-[85vh] w-full max-w-3xl flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="text-[13px]">
            Evidence <span className="num text-fg-3">{id}</span>
          </div>
          <Button small tone="ghost" onClick={onClose}>
            Close
          </Button>
        </header>
        <div className="overflow-auto p-4">
          <ErrorBox error={q.error} />
          {q.data && (
            <>
              <KV
                rows={[
                  ['Kind', q.data.kind],
                  ['Provider · endpoint', `${q.data.provider_id} · ${q.data.endpoint}`],
                  ['Observed', dt(q.data.observed_at)],
                  ['Slot', q.data.slot ?? '—'],
                  ['Verification', q.data.verification],
                  [
                    'SHA-256',
                    <span key="h" className="text-[11px]">
                      {q.data.sha256}
                    </span>,
                  ],
                ]}
              />
              <pre className="num mt-4 max-h-[50vh] overflow-auto rounded-md border border-line bg-ink p-3 text-[11px] leading-relaxed text-fg-2">
                {pretty ?? 'payload not found in storage'}
              </pre>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TokenPage() {
  const mint = useSearchParams().get('mint');
  return mint ? <Intelligence mint={mint} /> : <Search />;
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <TokenPage />
    </Suspense>
  );
}
