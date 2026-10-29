import { computeMetrics, type ClosedTrade, type EquityPoint } from '@alpha-desk/analytics';
import type { StrategyConfig } from '@alpha-desk/config';
import { applyReference, initialStop, sizePosition, type StopState } from '@alpha-desk/risk';
import {
  decideAnalyst,
  holderGrowthFactor,
  liquidityFactor,
  momentumFactor,
  smartWalletFactor,
  uniqueBuyersFactor,
  buySellValueFactor,
} from '@alpha-desk/scoring';
import { Decimal, usdToMicro } from '@alpha-desk/shared';

/** One recorded market observation (our own DexScreener snapshots). */
export interface ReplaySnapshot {
  mint: string;
  pair: string;
  symbol: string | null;
  at: number;
  priceUsd: number;
  marketCapUsd: number | null;
  liquidityUsd: number | null;
  volumeM5: number | null;
  volumeH1: number | null;
  changeM5: number | null;
  changeH1: number | null;
  changeH6: number | null;
  pairCreatedAt: number | null;
}

/** A Filter assessment as recorded at the time it was made. */
export interface ReplayAssessment {
  mint: string;
  completedAt: number;
  outcome: string;
  validUntil: number | null;
  onChainLiquidityUsd: number | null;
  sellImpactPct: number | null;
}

export type FilterMode = 'RECORDED' | 'MARKET_RULES_ONLY';

export interface ReplayParams {
  config: StrategyConfig;
  filterMode: FilterMode;
  startingEquityUsd: number;
  /** Fallback one-way cost estimate when no recorded impact exists (fees + impact), percent. */
  defaultOneWayCostPct: number;
}

export interface ReplayTrade extends ClosedTrade {
  entryPrice: number;
  exitPrice: number;
}

export interface ReplayResult {
  label: 'REPLAY_ESTIMATE';
  filterMode: FilterMode;
  retrospective: boolean;
  period: { start: number; end: number };
  observations: number;
  decisions: { considered: number; eligible: number; approved: number; entered: number };
  trades: ReplayTrade[];
  metrics: ReturnType<typeof computeMetrics>;
  notes: string[];
}

/**
 * Chronological replay of recorded observations. At each snapshot time t the engine sees only data with
 * observed_at ≤ t (no look-ahead): the price series so far, Filter assessments completed by t, and nothing
 * about later outcomes. Fills are estimates from recorded prices plus a cost model (recorded sell impact
 * when available), never executable quotes, so results are labelled REPLAY_ESTIMATE.
 */
export function replay(
  snapshots: ReplaySnapshot[],
  assessments: ReplayAssessment[],
  p: ReplayParams,
  period: { start: number; end: number },
): ReplayResult {
  const cfg = p.config;
  const notes: string[] = [];
  const stream = [...snapshots]
    .filter((s) => s.at >= period.start && s.at < period.end && s.priceUsd > 0)
    .sort((a, b) => a.at - b.at || a.mint.localeCompare(b.mint));
  const byMint = new Map<string, ReplayAssessment[]>();
  for (const a of [...assessments].sort((x, y) => x.completedAt - y.completedAt)) {
    if (!byMint.has(a.mint)) byMint.set(a.mint, []);
    byMint.get(a.mint)!.push(a);
  }
  const series = new Map<string, ReplaySnapshot[]>();
  const open = new Map<
    string,
    {
      entryAt: number;
      entryPrice: number;
      costMicro: bigint;
      qty: number;
      stop: StopState;
      plannedRiskMicro: bigint;
      snap: ReplaySnapshot;
      score: number;
      costPct: number;
      low: number;
    }
  >();
  const traded = new Set<string>();
  const trades: ReplayTrade[] = [];
  let cash = usdToMicro(p.startingEquityUsd);
  const equity: EquityPoint[] = [];
  const decisions = { considered: 0, eligible: 0, approved: 0, entered: 0 };

  const costPctFor = (a: ReplayAssessment | null) =>
    a?.sellImpactPct !== null && a?.sellImpactPct !== undefined
      ? a.sellImpactPct + 0.5
      : p.defaultOneWayCostPct;

  for (const s of stream) {
    const hist = series.get(s.pair) ?? [];
    hist.push(s);
    series.set(s.pair, hist);

    // 1. protect open positions with the information available now
    const pos = open.get(s.mint);
    if (pos) {
      const exitRef = s.priceUsd * (1 - pos.costPct / 100);
      pos.low = Math.min(pos.low, exitRef);
      const r = applyReference(pos.stop, new Decimal(exitRef), cfg.risk);
      pos.stop = r.state;
      if (r.events.some((e) => e.kind === 'TRIGGERED')) {
        const proceeds = usdToMicro(new Decimal(pos.qty).mul(exitRef));
        cash += proceeds;
        const pnl = proceeds - pos.costMicro;
        trades.push({
          id: `${s.mint}:${pos.entryAt}`,
          mint: s.mint,
          symbol: s.symbol,
          entryAt: pos.entryAt,
          exitAt: s.at,
          entryCostMicro: pos.costMicro,
          realizedPnlMicro: pnl,
          feesMicro: 0n,
          rMultiple: pos.plannedRiskMicro > 0n ? Number(pnl) / Number(pos.plannedRiskMicro) : null,
          mfePct:
            (Number(pos.stop.highestReference.toString()) / Number(pos.stop.entryReference.toString()) - 1) *
            100,
          maePct: (pos.low / Number(pos.stop.entryReference.toString()) - 1) * 100,
          exitReason: pos.stop.trailingActive ? 'TRAILING_STOP' : 'STOP',
          strategyVersion: cfg.strategyVersion,
          tokenAgeMinutesAtEntry: pos.snap.pairCreatedAt
            ? (pos.entryAt - pos.snap.pairCreatedAt) / 60_000
            : null,
          marketCapAtEntry: pos.snap.marketCapUsd,
          liquidityAtEntry: pos.snap.liquidityUsd,
          scoreAtEntry: pos.score,
          entryPrice: pos.entryPrice,
          exitPrice: exitRef,
        });
        open.delete(s.mint);
      }
    }

    // 2. consider an entry
    if (!open.has(s.mint) && !traded.has(s.mint)) {
      decisions.considered++;
      const age = s.pairCreatedAt ? (s.at - s.pairCreatedAt) / 60_000 : null;
      const inDiscovery =
        age !== null &&
        age >= cfg.discovery.minPairAgeMinutes &&
        age <= cfg.discovery.maxPairAgeHours * 60 &&
        s.marketCapUsd !== null &&
        s.marketCapUsd >= cfg.discovery.minMarketCapUsd &&
        s.marketCapUsd <= cfg.discovery.maxMarketCapUsd;
      const known = (byMint.get(s.mint) ?? []).filter((a) => a.completedAt <= s.at);
      const latest = known[known.length - 1] ?? null;
      let eligible: boolean;
      let filterValidUntil: number | null;
      if (p.filterMode === 'RECORDED') {
        eligible = Boolean(
          inDiscovery &&
          latest &&
          latest.outcome === 'FILTER_APPROVED' &&
          latest.validUntil !== null &&
          latest.validUntil >= s.at,
        );
        filterValidUntil = latest?.validUntil ?? null;
      } else {
        // Research mode: market-observable rules only (F004, F005, F010). Not production-equivalent.
        eligible = Boolean(
          inDiscovery &&
          (s.liquidityUsd ?? 0) >= cfg.filter.minLiquidityUsd &&
          (s.volumeH1 ?? 0) >= cfg.filter.minVolume1hUsd &&
          s.changeH1 !== null &&
          s.changeH1 <= cfg.filter.maxPriceChange1hPct,
        );
        filterValidUntil = s.at + cfg.filter.approvalTtlSeconds * 1000;
      }
      if (eligible) {
        decisions.eligible++;
        const window = hist.filter((h) => h.at >= s.at - 30 * 60_000);
        const unavailableFlow = {
          trades: null,
          windowStart: s.at - 3_600_000,
          windowEnd: s.at,
          countBuys: null,
          countSells: null,
        };
        const factors = [
          momentumFactor(
            {
              change: { m5: s.changeM5, h1: s.changeH1, h6: s.changeH6 },
              volume: { m5: s.volumeM5, h1: s.volumeH1 },
              series: window.map((h) => ({ at: h.at, priceUsd: h.priceUsd })),
              observedAt: s.at,
            },
            cfg.analyst.factors.momentum,
          ),
          uniqueBuyersFactor(unavailableFlow, cfg.analyst.factors.uniqueBuyers),
          buySellValueFactor(unavailableFlow, cfg.analyst.factors.buySellValueRatio),
          holderGrowthFactor(null, cfg.analyst.factors.holderGrowth),
          liquidityFactor(
            {
              onChainLiquidityUsd:
                latest?.onChainLiquidityUsd ?? (p.filterMode === 'MARKET_RULES_ONLY' ? s.liquidityUsd : null),
              marketCapUsd: s.marketCapUsd,
              sellImpactPct: latest?.sellImpactPct ?? 1,
            },
            cfg.analyst.factors.liquidityToMcap,
          ),
          smartWalletFactor(
            { buyers: null, registry: new Set(), registryBuiltAt: null, decisionAt: s.at },
            cfg.analyst.factors.smartWallets,
          ),
        ];
        const analystCfg =
          p.filterMode === 'MARKET_RULES_ONLY'
            ? {
                ...cfg.analyst,
                minVerifiedWeight: 0,
                factors: Object.fromEntries(
                  Object.entries(cfg.analyst.factors).map(([k, f]) => [
                    k,
                    { ...f, required: k === 'momentum' || k === 'liquidityToMcap' },
                  ]),
                ) as typeof cfg.analyst.factors,
              }
            : cfg.analyst;
        // Research mode rescales the market-observable factors (momentum, liquidity) to 0–100; labelled in notes.
        const scored = p.filterMode === 'MARKET_RULES_ONLY' ? rescaleObservable(factors) : factors;
        const d = decideAnalyst(scored, analystCfg, { now: s.at, filterValidUntil });
        if (d.outcome === 'ANALYST_APPROVED') {
          decisions.approved++;
          const costPct = costPctFor(latest);
          const positionsValue = [...open.values()].reduce((sum, o) => sum + o.costMicro, 0n);
          const eq = cash + positionsValue;
          if (open.size < cfg.risk.maxConcurrentPositions) {
            const sizing = sizePosition(
              {
                equityMicro: eq,
                cashMicro: cash,
                openExposureMicro: positionsValue,
                estEntryCostPct: new Decimal(costPct),
                estExitCostPct: new Decimal(costPct),
                liquidityUsd: new Decimal(latest?.onChainLiquidityUsd ?? s.liquidityUsd ?? 0),
                feeReserveMicro: 0n,
              },
              cfg.risk,
            );
            if (sizing.notionalMicro >= 10_000_000n) {
              const entryPrice = s.priceUsd * (1 + costPct / 100);
              const qty = Number(sizing.notionalMicro) / 1e6 / entryPrice;
              const entryRef = new Decimal(s.priceUsd * (1 - costPct / 100));
              cash -= sizing.notionalMicro;
              open.set(s.mint, {
                entryAt: s.at,
                entryPrice,
                costMicro: sizing.notionalMicro,
                qty,
                stop: {
                  entryReference: entryRef,
                  effectiveStop: initialStop(entryRef, cfg.risk),
                  trailingActive: false,
                  highestReference: entryRef,
                },
                plannedRiskMicro: sizing.plannedRiskMicro,
                snap: s,
                score: Number(d.totalScore),
                costPct,
                low: Number(entryRef.toString()),
              });
              traded.add(s.mint);
              decisions.entered++;
            }
          }
        }
      }
    }
    const marked = [...open.values()].reduce((sum, o) => {
      const last = series.get(o.snap.pair)?.at(-1);
      return (
        sum + (last ? usdToMicro(new Decimal(o.qty).mul(last.priceUsd * (1 - o.costPct / 100))) : o.costMicro)
      );
    }, 0n);
    equity.push({ at: s.at, equityMicro: cash + marked });
  }
  if (open.size)
    notes.push(
      `${open.size} position(s) still open at the end of the period are excluded from closed-trade metrics`,
    );
  if (p.filterMode === 'MARKET_RULES_ONLY')
    notes.push(
      'RESEARCH MODE: only market-observable rules (F004, F005, F010) were applied; the score is momentum and liquidity rescaled to 0–100 because indexer factors are not observable from market data. Results are not comparable to production eligibility.',
    );
  if (p.filterMode === 'RECORDED')
    notes.push('Eligibility uses Filter assessments exactly as recorded at the time (timestamp-consistent).');
  notes.push(
    'Fills are estimated from recorded last-trade prices with a cost model; they are not executable quotes.',
  );
  return {
    label: 'REPLAY_ESTIMATE',
    filterMode: p.filterMode,
    retrospective: p.filterMode === 'MARKET_RULES_ONLY',
    period,
    observations: stream.length,
    decisions,
    trades,
    metrics: computeMetrics(trades, equity),
    notes,
  };
}

function rescaleObservable<T extends { factor: string; score: string; weight: number }>(factors: T[]): T[] {
  const observable = factors.filter((f) => f.factor === 'momentum' || f.factor === 'liquidityToMcap');
  const w = observable.reduce((sum, f) => sum + f.weight, 0);
  return observable.map((f) => ({
    ...f,
    weight: (f.weight * 100) / w,
    score: String((Number(f.score) * 100) / w),
  }));
}

export interface Fold {
  name: 'development' | 'validation' | 'test' | `walk-${number}`;
  start: number;
  end: number;
}

/** Development / validation / out-of-sample split by time (60 / 20 / 20). */
export function splitPeriods(start: number, end: number): Fold[] {
  const span = end - start;
  const a = start + Math.floor(span * 0.6);
  const b = start + Math.floor(span * 0.8);
  return [
    { name: 'development', start, end: a },
    { name: 'validation', start: a, end: b },
    { name: 'test', start: b, end },
  ];
}

/** Anchored walk-forward: k consecutive out-of-sample windows after an initial training window. */
export function walkForward(start: number, end: number, k: number): Fold[] {
  const span = end - start;
  const train = Math.floor(span * 0.4);
  const step = Math.floor((span - train) / k);
  return Array.from({ length: k }, (_, i) => ({
    name: `walk-${i + 1}` as const,
    start: start + train + i * step,
    end: i === k - 1 ? end : start + train + (i + 1) * step,
  }));
}
