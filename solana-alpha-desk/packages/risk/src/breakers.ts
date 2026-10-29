import type { StrategyConfig } from '@alpha-desk/config';
import { Decimal } from '@alpha-desk/shared';

export const BREAKERS = [
  'DAILY_LOSS',
  'MAX_DRAWDOWN',
  'DATA_OUTAGE',
  'VERIFICATION_QUALITY',
  'DB_INTEGRITY',
  'ROUTE_FAILURES',
  'EMERGENCY_PAUSE',
  'LIQUIDITY_WITHDRAWAL',
  'DEVELOPER_MOVEMENT',
  'API_BUDGET',
] as const;
export type Breaker = (typeof BREAKERS)[number];

/** Breakers that only block new entries; open positions keep being monitored and protected. */
export const ENTRY_BLOCKING: ReadonlySet<Breaker> = new Set(BREAKERS);

export interface EquityState {
  equityMicro: bigint;
  dayOpenEquityMicro: bigint;
  peakEquityMicro: bigint;
}

export interface BreakerTrip {
  breaker: Breaker;
  detail: string;
}

/** Portfolio-level loss breakers: daily loss vs opening-day equity, and peak-to-trough drawdown. */
export function evaluateLossBreakers(s: EquityState, cfg: StrategyConfig['risk']): BreakerTrip[] {
  const trips: BreakerTrip[] = [];
  const eq = new Decimal(s.equityMicro.toString());
  const open = new Decimal(s.dayOpenEquityMicro.toString());
  const peak = new Decimal(s.peakEquityMicro.toString());
  if (open.gt(0)) {
    const loss = open.sub(eq).div(open).mul(100);
    if (loss.gte(cfg.dailyLossLimitPct))
      trips.push({
        breaker: 'DAILY_LOSS',
        detail: `equity down ${loss.toFixed(2)}% from today's open (limit ${cfg.dailyLossLimitPct}%)`,
      });
  }
  if (peak.gt(0)) {
    const dd = peak.sub(eq).div(peak).mul(100);
    if (dd.gte(cfg.maxDrawdownPct))
      trips.push({
        breaker: 'MAX_DRAWDOWN',
        detail: `drawdown ${dd.toFixed(2)}% from peak (limit ${cfg.maxDrawdownPct}%)`,
      });
  }
  return trips;
}

export function evaluateRouteFailures(
  failureTimes: number[],
  now: number,
  cfg: StrategyConfig['risk'],
): BreakerTrip | null {
  const recent = failureTimes.filter((t) => now - t <= cfg.routeFailureWindowMinutes * 60_000);
  return recent.length >= cfg.routeFailurePauseCount
    ? {
        breaker: 'ROUTE_FAILURES',
        detail: `${recent.length} route failures in ${cfg.routeFailureWindowMinutes} min`,
      }
    : null;
}

/** The phrase an owner must type to reset a breaker (docs/risk-policy.md §Reset procedure). */
export const resetPhrase = (b: Breaker) => `RESET ${b}`;

export interface ResetCheck {
  allowed: boolean;
  reason: string;
}

/**
 * Preconditions for a reset. A breaker is never cleared automatically; the owner must supply the phrase
 * and a reason, and the condition that tripped it must no longer hold.
 */
export function canReset(
  b: Breaker,
  ctx: {
    phrase: string;
    reason: string;
    equity: EquityState;
    cfg: StrategyConfig['risk'];
    dataHealthy: boolean;
    integrityOk: boolean;
    today: string;
    trippedDay: string | null;
  },
): ResetCheck {
  if (ctx.phrase.trim() !== resetPhrase(b))
    return { allowed: false, reason: `type "${resetPhrase(b)}" to confirm` };
  if (ctx.reason.trim().length < 10)
    return { allowed: false, reason: 'give a reason of at least 10 characters' };
  if (b === 'DAILY_LOSS' && ctx.trippedDay === ctx.today)
    return { allowed: false, reason: 'the daily loss breaker can only be reset on a new trading day' };
  if (b === 'DATA_OUTAGE' && !ctx.dataHealthy)
    return { allowed: false, reason: 'critical data feeds are still unhealthy' };
  if (b === 'DB_INTEGRITY' && !ctx.integrityOk)
    return { allowed: false, reason: 'ledger reconciliation has not passed' };
  return { allowed: true, reason: 'ok' };
}
