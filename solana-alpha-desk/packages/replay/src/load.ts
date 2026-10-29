import type { SqlDb } from '@alpha-desk/db';
import type { ReplayAssessment, ReplaySnapshot } from './engine.ts';

const n = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v));

/** Loads recorded observations for a period. Only data with an observation timestamp is used. */
export async function loadReplayData(
  db: SqlDb,
  start: number,
  end: number,
): Promise<{ snapshots: ReplaySnapshot[]; assessments: ReplayAssessment[] }> {
  const rows = await db.all<Record<string, unknown>>(
    `SELECT s.mint, s.pair_address, t.symbol, s.observed_at, s.price_usd, s.market_cap_usd, s.liquidity_usd, s.volume_m5, s.volume_h1, s.change_m5, s.change_h1, s.change_h6, p.pair_created_at
     FROM market_snapshots s LEFT JOIN tokens t ON t.mint = s.mint LEFT JOIN token_pools p ON p.pair_address = s.pair_address
     WHERE s.observed_at >= ? AND s.observed_at < ? ORDER BY s.observed_at`,
    [start, end],
  );
  const snapshots: ReplaySnapshot[] = rows.map((r) => ({
    mint: String(r.mint),
    pair: String(r.pair_address),
    symbol: (r.symbol as string | null) ?? null,
    at: Number(r.observed_at),
    priceUsd: Number(r.price_usd ?? 0),
    marketCapUsd: n(r.market_cap_usd),
    liquidityUsd: n(r.liquidity_usd),
    volumeM5: n(r.volume_m5),
    volumeH1: n(r.volume_h1),
    changeM5: n(r.change_m5),
    changeH1: n(r.change_h1),
    changeH6: n(r.change_h6),
    pairCreatedAt: n(r.pair_created_at),
  }));
  const arows = await db.all<{
    mint: string;
    completed_at: number;
    outcome: string;
    valid_until: number | null;
    summary: string;
  }>(
    `SELECT mint, completed_at, outcome, valid_until, summary FROM token_security_assessments WHERE completed_at < ? ORDER BY completed_at`,
    [end],
  );
  const assessments: ReplayAssessment[] = arows.map((a) => {
    const s = JSON.parse(a.summary || '{}') as {
      onChainLiquidityUsd?: string | null;
      sellImpactPct?: string | null;
    };
    return {
      mint: a.mint,
      completedAt: a.completed_at,
      outcome: a.outcome,
      validUntil: a.valid_until,
      onChainLiquidityUsd: n(s.onChainLiquidityUsd),
      sellImpactPct: n(s.sellImpactPct),
    };
  });
  return { snapshots, assessments };
}
