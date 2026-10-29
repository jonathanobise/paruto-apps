import { Decimal, microToUsd } from '@alpha-desk/shared';

export interface ClosedTrade {
  id: string;
  mint: string;
  symbol: string | null;
  entryAt: number;
  exitAt: number;
  entryCostMicro: bigint;
  realizedPnlMicro: bigint;
  feesMicro: bigint;
  rMultiple: number | null;
  mfePct: number | null;
  maePct: number | null;
  exitReason: string;
  strategyVersion: string;
  tokenAgeMinutesAtEntry: number | null;
  marketCapAtEntry: number | null;
  liquidityAtEntry: number | null;
  scoreAtEntry: number | null;
}

export interface EquityPoint {
  at: number;
  equityMicro: bigint;
}

export interface Metrics {
  trades: number;
  wins: number;
  losses: number;
  winRatePct: string | null;
  avgWinUsd: string | null;
  avgLossUsd: string | null;
  expectancyUsd: string | null;
  expectancyR: string | null;
  profitFactor: string | null;
  netPnlUsd: string;
  feesUsd: string;
  avgDurationMinutes: string | null;
  maxDrawdownPct: string | null;
  sharpe: string | null;
  sortino: string | null;
  statisticalNote: string;
}

const MIN_TRADES_FOR_RATIOS = 30;

/**
 * Performance metrics from closed paper trades and the equity curve. Sharpe and Sortino are computed
 * only on daily returns with at least 30 observations, otherwise reported as null with a note — small
 * samples make them meaningless.
 */
export function computeMetrics(trades: ClosedTrade[], equity: EquityPoint[]): Metrics {
  const wins = trades.filter((t) => t.realizedPnlMicro > 0n);
  const losses = trades.filter((t) => t.realizedPnlMicro <= 0n);
  const sum = (xs: ClosedTrade[]) => xs.reduce((s, t) => s + t.realizedPnlMicro, 0n);
  const grossWin = sum(wins);
  const grossLoss = -sum(losses);
  const net = grossWin - grossLoss;
  const rs = trades.map((t) => t.rMultiple).filter((r): r is number => r !== null);
  const daily = dailyReturns(equity);
  const ratiosOk = daily.length >= MIN_TRADES_FOR_RATIOS;
  return {
    trades: trades.length,
    wins: wins.length,
    losses: losses.length,
    winRatePct: trades.length ? new Decimal(wins.length).div(trades.length).mul(100).toFixed(2) : null,
    avgWinUsd: wins.length ? microToUsd(grossWin).div(wins.length).toFixed(2) : null,
    avgLossUsd: losses.length ? microToUsd(-grossLoss).div(losses.length).toFixed(2) : null,
    expectancyUsd: trades.length ? microToUsd(net).div(trades.length).toFixed(2) : null,
    expectancyR: rs.length ? (rs.reduce((a, b) => a + b, 0) / rs.length).toFixed(3) : null,
    profitFactor: grossLoss > 0n ? new Decimal(grossWin.toString()).div(grossLoss.toString()).toFixed(3) : null,
    netPnlUsd: microToUsd(net).toFixed(2),
    feesUsd: microToUsd(trades.reduce((s, t) => s + t.feesMicro, 0n)).toFixed(2),
    avgDurationMinutes: trades.length ? (trades.reduce((s, t) => s + (t.exitAt - t.entryAt), 0) / trades.length / 60_000).toFixed(1) : null,
    maxDrawdownPct: maxDrawdownPct(equity),
    sharpe: ratiosOk ? sharpe(daily) : null,
    sortino: ratiosOk ? sortino(daily) : null,
    statisticalNote:
      trades.length < 100
        ? `${trades.length} closed trades: below the 100-trade observation threshold; results are not statistically meaningful.`
        : 'At least 100 trades observed. This is an operational threshold, not proof of significance or of future profitability.',
  };
}

export function maxDrawdownPct(equity: EquityPoint[]): string | null {
  if (equity.length < 2) return null;
  let peak = equity[0]!.equityMicro;
  let worst = new Decimal(0);
  for (const p of equity) {
    if (p.equityMicro > peak) peak = p.equityMicro;
    if (peak > 0n) {
      const dd = new Decimal((peak - p.equityMicro).toString()).div(peak.toString()).mul(100);
      if (dd.gt(worst)) worst = dd;
    }
  }
  return worst.toFixed(3);
}

/** Last equity value per UTC day → simple daily returns. */
export function dailyReturns(equity: EquityPoint[]): number[] {
  const byDay = new Map<string, bigint>();
  for (const p of [...equity].sort((a, b) => a.at - b.at)) byDay.set(new Date(p.at).toISOString().slice(0, 10), p.equityMicro);
  const vals = [...byDay.values()].map((v) => Number(v));
  const out: number[] = [];
  for (let i = 1; i < vals.length; i++) if (vals[i - 1]! > 0) out.push(vals[i]! / vals[i - 1]! - 1);
  return out;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
function sharpe(r: number[]): string | null {
  const m = mean(r);
  const sd = Math.sqrt(r.reduce((s, x) => s + (x - m) ** 2, 0) / (r.length - 1));
  return sd > 0 ? ((m / sd) * Math.sqrt(365)).toFixed(3) : null;
}
function sortino(r: number[]): string | null {
  const m = mean(r);
  const downside = r.filter((x) => x < 0);
  if (!downside.length) return null;
  const dd = Math.sqrt(downside.reduce((s, x) => s + x * x, 0) / r.length);
  return dd > 0 ? ((m / dd) * Math.sqrt(365)).toFixed(3) : null;
}

export interface Segment {
  key: string;
  metrics: Pick<Metrics, 'trades' | 'winRatePct' | 'expectancyUsd' | 'netPnlUsd' | 'profitFactor'>;
}

function bucket(v: number | null, edges: number[], labels: string[]): string {
  if (v === null) return 'unknown';
  for (let i = 0; i < edges.length; i++) if (v < edges[i]!) return labels[i]!;
  return labels[labels.length - 1]!;
}

export const SEGMENTERS: Record<string, (t: ClosedTrade) => string> = {
  tokenAge: (t) => bucket(t.tokenAgeMinutesAtEntry, [120, 360, 1440, 4320], ['30m–2h', '2–6h', '6–24h', '24–72h', '>72h']),
  marketCap: (t) => bucket(t.marketCapAtEntry, [1e6, 5e6, 2e7], ['$0.3–1M', '$1–5M', '$5–20M', '>$20M']),
  liquidity: (t) => bucket(t.liquidityAtEntry, [1e5, 3e5, 1e6], ['$40–100k', '$100–300k', '$300k–1M', '>$1M']),
  scoreBand: (t) => bucket(t.scoreAtEntry, [75, 80, 90], ['70–75', '75–80', '80–90', '90–100']),
  hourUtc: (t) => `${String(new Date(t.entryAt).getUTCHours()).padStart(2, '0')}:00 UTC`,
  strategy: (t) => t.strategyVersion,
  exitReason: (t) => t.exitReason,
};

export function segment(trades: ClosedTrade[], by: keyof typeof SEGMENTERS): Segment[] {
  const groups = new Map<string, ClosedTrade[]>();
  for (const t of trades) {
    const k = SEGMENTERS[by]!(t);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(t);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, ts]) => {
      const m = computeMetrics(ts, []);
      return { key, metrics: { trades: m.trades, winRatePct: m.winRatePct, expectancyUsd: m.expectancyUsd, netPnlUsd: m.netPnlUsd, profitFactor: m.profitFactor } };
    });
}
