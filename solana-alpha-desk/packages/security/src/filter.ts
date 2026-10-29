import type { StrategyConfig } from '@alpha-desk/config';
import { aggregateFilter, evaluateRules, type FilterOutcome, type RuleResult, type SecurityEvidence } from './rules.ts';

export interface FilterDecision {
  outcome: FilterOutcome;
  results: RuleResult[];
  failed: string[];
  unverified: string[];
  errors: string[];
  observedAt: number;
  validUntil: number | null;
}

/** Filter Agent entry point: evidence in, rule matrix and outcome out. */
export function runFilter(evidence: SecurityEvidence, cfg: StrategyConfig['filter'], now: number): FilterDecision {
  const results = evaluateRules(evidence, cfg, now);
  const outcome = aggregateFilter(results);
  const times = [evidence.mintFacts, evidence.pool, evidence.market, evidence.route].map((f) => f.observedAt).filter((t): t is number => t !== null);
  const observedAt = times.length ? Math.min(...times) : now;
  return {
    outcome,
    results,
    failed: results.filter((r) => r.outcome === 'FAIL').map((r) => r.ruleId),
    unverified: results.filter((r) => r.outcome === 'UNVERIFIED').map((r) => r.ruleId),
    errors: results.filter((r) => r.outcome === 'ERROR').map((r) => r.ruleId),
    observedAt,
    validUntil: outcome === 'FILTER_APPROVED' ? observedAt + cfg.approvalTtlSeconds * 1000 : null,
  };
}
