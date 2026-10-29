import type { StrategyConfig } from '@alpha-desk/config';
import type { Decimal, RuntimeMode } from '@alpha-desk/shared';
import type { Breaker } from './breakers.ts';
import { sizePosition, MIN_ORDER_MICRO, type SizingInput, type SizingResult } from './sizing.ts';

export type RiskDecision = 'RISK_AUTHORIZED' | 'RISK_REJECTED' | 'RISK_PAUSED';

export interface RiskContext {
  now: number;
  mode: RuntimeMode;
  manualApproval: boolean;
  activeBreakers: Breaker[];
  entriesPausedReason: string | null;
  openPositions: number;
  openMints: Set<string>;
  tradesToday: number;
  analystValidUntil: number | null;
  quoteObservedAt: number;
  configVersion: string;
  activeConfigVersion: string;
}

export interface AuthorizationRequest {
  mint: string;
  portfolioId: string;
  proposedOrderId: string;
  referencePriceUsd: Decimal;
  sizing: SizingInput;
}

export interface RiskVerdict {
  decision: RiskDecision;
  reasons: string[];
  sizing: SizingResult | null;
  maxNotionalMicro: bigint;
  expiresAt: number;
}

/**
 * Risk Agent pre-trade authorization. Independent of the Analyst: it re-checks portfolio limits,
 * breakers, freshness and costs, and sizes the order. A RISK_AUTHORIZED verdict is persisted as a
 * single-use, short-lived authorization bound to one mint, order, portfolio, notional and config version.
 */
export function authorize(
  req: AuthorizationRequest,
  ctx: RiskContext,
  cfg: StrategyConfig['risk'],
): RiskVerdict {
  const reasons: string[] = [];
  const expiresAt = ctx.now + cfg.authorizationTtlSeconds * 1000;
  const paused = (why: string): RiskVerdict => ({
    decision: 'RISK_PAUSED',
    reasons: [why],
    sizing: null,
    maxNotionalMicro: 0n,
    expiresAt,
  });

  if (ctx.mode === 'EMERGENCY_PAUSED') return paused('emergency pause is active');
  if (ctx.mode === 'STOPPED' || ctx.mode === 'DISCOVERY_ONLY')
    return paused(`runtime mode ${ctx.mode} does not open positions`);
  if (ctx.mode === 'PAPER_MANUAL' && !ctx.manualApproval)
    return paused('PAPER_MANUAL requires the owner to approve each entry');
  if (ctx.activeBreakers.length) return paused(`circuit breaker active: ${ctx.activeBreakers.join(', ')}`);
  if (ctx.entriesPausedReason) return paused(`entries paused: ${ctx.entriesPausedReason}`);
  if (ctx.configVersion !== ctx.activeConfigVersion)
    return paused('candidate was evaluated under a superseded configuration');

  if (ctx.openMints.has(req.mint)) reasons.push('already exposed to this token (no averaging or duplicates)');
  if (ctx.openPositions >= cfg.maxConcurrentPositions)
    reasons.push(`${ctx.openPositions} positions open (max ${cfg.maxConcurrentPositions})`);
  if (ctx.tradesToday >= cfg.maxDailyTrades) reasons.push(`daily trade limit ${cfg.maxDailyTrades} reached`);
  if (!ctx.analystValidUntil || ctx.analystValidUntil < ctx.now) reasons.push('analyst approval expired');
  if (ctx.now - ctx.quoteObservedAt > cfg.maxQuoteAgeSeconds * 1000) reasons.push('entry quote is stale');
  const totalCost = req.sizing.estEntryCostPct.add(req.sizing.estExitCostPct);
  if (req.sizing.estEntryCostPct.gt(cfg.maxEntryCostPct))
    reasons.push(
      `estimated entry cost ${req.sizing.estEntryCostPct.toFixed(2)}% exceeds ${cfg.maxEntryCostPct}%`,
    );
  if (totalCost.gt(cfg.maxEntryCostPct * 2))
    reasons.push(`round-trip cost ${totalCost.toFixed(2)}% is unacceptable`);
  if (req.referencePriceUsd.lte(0)) reasons.push('no executable reference price');

  const sizing = sizePosition(req.sizing, cfg);
  if (sizing.notionalMicro < MIN_ORDER_MICRO)
    reasons.push(`sized notional below the $10 minimum (bound by ${sizing.binding})`);

  if (reasons.length) return { decision: 'RISK_REJECTED', reasons, sizing, maxNotionalMicro: 0n, expiresAt };
  return {
    decision: 'RISK_AUTHORIZED',
    reasons: [`authorized up to ${sizing.notionalMicro} micro-USD (bound by ${sizing.binding})`],
    sizing,
    maxNotionalMicro: sizing.notionalMicro,
    expiresAt,
  };
}

export interface StoredAuthorization {
  id: string;
  portfolioId: string;
  mint: string;
  proposedOrderId: string;
  maxNotionalMicro: bigint;
  referencePriceUsd: Decimal;
  configVersion: string;
  decision: RiskDecision;
  expiresAt: number;
  consumedAt: number | null;
  invalidatedAt: number | null;
}

/** Checks an authorization at the moment of execution. Every condition must hold. */
export function validateAuthorization(
  auth: StoredAuthorization | null,
  use: {
    now: number;
    mint: string;
    portfolioId: string;
    proposedOrderId: string;
    notionalMicro: bigint;
    currentReferencePriceUsd: Decimal;
    activeConfigVersion: string;
  },
  cfg: StrategyConfig['risk'],
): { valid: boolean; reasons: string[] } {
  if (!auth) return { valid: false, reasons: ['no authorization'] };
  const reasons: string[] = [];
  if (auth.decision !== 'RISK_AUTHORIZED') reasons.push(`authorization decision is ${auth.decision}`);
  if (auth.consumedAt !== null) reasons.push('authorization already used');
  if (auth.invalidatedAt !== null) reasons.push('authorization invalidated');
  if (use.now >= auth.expiresAt) reasons.push('authorization expired');
  if (auth.mint !== use.mint) reasons.push('authorization is for a different token');
  if (auth.portfolioId !== use.portfolioId) reasons.push('authorization is for a different portfolio');
  if (auth.proposedOrderId !== use.proposedOrderId) reasons.push('authorization is for a different order');
  if (use.notionalMicro > auth.maxNotionalMicro)
    reasons.push('order notional exceeds the authorized maximum');
  if (use.notionalMicro <= 0n) reasons.push('order notional must be positive');
  if (auth.configVersion !== use.activeConfigVersion)
    reasons.push('configuration changed since authorization');
  if (auth.referencePriceUsd.gt(0)) {
    const move = use.currentReferencePriceUsd
      .sub(auth.referencePriceUsd)
      .abs()
      .div(auth.referencePriceUsd)
      .mul(100);
    if (move.gt(cfg.maxPriceMoveSinceAuthPct))
      reasons.push(`price moved ${move.toFixed(2)}% since authorization`);
  }
  return { valid: reasons.length === 0, reasons };
}
