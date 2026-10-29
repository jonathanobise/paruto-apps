import type { StrategyConfig } from '@alpha-desk/config';
import { Decimal } from '@alpha-desk/shared';
import type { FactorName, FactorResult } from './factors.ts';

export type AnalystOutcome = 'ANALYST_APPROVED' | 'ANALYST_REJECTED' | 'ANALYST_UNVERIFIED';

export interface AnalystDecision {
  outcome: AnalystOutcome;
  totalScore: string;
  verifiedWeight: number;
  factors: FactorResult[];
  reasons: string[];
  validUntil: number | null;
}

/**
 * Analyst Agent: combines the six versioned factors. A candidate passes only when the total is at least
 * the threshold, every required factor is VERIFIED, enough weight is VERIFIED, and the Filter approval
 * is still valid. Scores are bounded to 0–100 by construction (Σ weights = 100, each normalised 0–1).
 */
export function decideAnalyst(
  factors: FactorResult[],
  cfg: StrategyConfig['analyst'],
  ctx: { now: number; filterValidUntil: number | null },
): AnalystDecision {
  const total = factors.reduce((s, f) => s.add(f.score), new Decimal(0));
  const bounded = Decimal.min(100, Decimal.max(0, total));
  const verifiedWeight = factors.filter((f) => f.quality === 'VERIFIED').reduce((s, f) => s + f.weight, 0);
  const reasons: string[] = [];
  const requiredMissing = (Object.keys(cfg.factors) as FactorName[]).filter(
    (name) => cfg.factors[name].required && factors.find((f) => f.factor === name)?.quality !== 'VERIFIED',
  );

  let outcome: AnalystOutcome;
  if (!ctx.filterValidUntil || ctx.filterValidUntil < ctx.now) {
    outcome = 'ANALYST_UNVERIFIED';
    reasons.push('filter approval expired or missing');
  } else if (requiredMissing.length) {
    outcome = 'ANALYST_UNVERIFIED';
    reasons.push(`required factors not verified: ${requiredMissing.join(', ')}`);
  } else if (verifiedWeight < cfg.minVerifiedWeight) {
    outcome = 'ANALYST_UNVERIFIED';
    reasons.push(`only ${verifiedWeight} of ${cfg.minVerifiedWeight} required weight is verified`);
  } else if (bounded.lt(cfg.passThreshold)) {
    outcome = 'ANALYST_REJECTED';
    reasons.push(`score ${bounded.toFixed(2)} below ${cfg.passThreshold}`);
  } else {
    outcome = 'ANALYST_APPROVED';
    reasons.push(`score ${bounded.toFixed(2)} ≥ ${cfg.passThreshold}`);
  }
  const validUntil =
    outcome === 'ANALYST_APPROVED'
      ? Math.min(ctx.now + cfg.approvalTtlSeconds * 1000, ctx.filterValidUntil ?? Infinity)
      : null;
  return { outcome, totalScore: bounded.toFixed(4), verifiedWeight, factors, reasons, validUntil };
}

export interface RankInput {
  id: string;
  eligible: boolean;
  score: number;
  verifiedWeight: number;
  executionDepthUsd: number;
  buyerClusters: number;
  signalAt: number;
}

/** Ranking: eligibility, score, data quality, execution depth, independent buyers, recency. */
export function rankOpportunities<T extends RankInput>(items: T[]): T[] {
  return [...items].sort(
    (a, b) =>
      Number(b.eligible) - Number(a.eligible) ||
      b.score - a.score ||
      b.verifiedWeight - a.verifiedWeight ||
      b.executionDepthUsd - a.executionDepthUsd ||
      b.buyerClusters - a.buyerClusters ||
      b.signalAt - a.signalAt ||
      a.id.localeCompare(b.id),
  );
}
