import type { StrategyConfig } from '@alpha-desk/config';
import { Decimal } from '@alpha-desk/shared';

export interface StopState {
  entryReference: Decimal;
  effectiveStop: Decimal;
  trailingActive: boolean;
  highestReference: Decimal;
}

export type StopEvent =
  | { kind: 'TRAILING_ACTIVATED'; previous: Decimal; next: Decimal; reference: Decimal }
  | { kind: 'RAISED'; previous: Decimal; next: Decimal; reference: Decimal }
  | { kind: 'TRIGGERED'; previous: Decimal; next: Decimal; reference: Decimal };

export function initialStop(entryReference: Decimal, cfg: StrategyConfig['risk']): Decimal {
  return entryReference.mul(new Decimal(100).sub(cfg.initialStopPct)).div(100);
}

/**
 * Applies one fresh executable reference price to a long position's stop.
 * - The highest valid reference is tracked.
 * - Trailing activates once a reference reaches entry × (1 + activation%).
 * - While trailing, the candidate stop is highest × (1 − distance%); the effective stop is the greater
 *   of the previous effective stop and that level, so it can never be lowered.
 * - The stop triggers when the reference is at or below the effective stop.
 * Callers must only pass references from fresh, executable quotes.
 */
export function applyReference(state: StopState, reference: Decimal, cfg: StrategyConfig['risk']): { state: StopState; events: StopEvent[] } {
  if (!reference.isFinite() || reference.lte(0)) throw new Error('reference price must be positive');
  const events: StopEvent[] = [];
  const next: StopState = { ...state, highestReference: Decimal.max(state.highestReference, reference) };
  const activation = state.entryReference.mul(new Decimal(100).add(cfg.trailingActivationPct)).div(100);
  if (!next.trailingActive && reference.gte(activation)) {
    next.trailingActive = true;
    const trail = next.highestReference.mul(new Decimal(100).sub(cfg.trailingDistancePct)).div(100);
    const eff = Decimal.max(state.effectiveStop, trail);
    events.push({ kind: 'TRAILING_ACTIVATED', previous: state.effectiveStop, next: eff, reference });
    next.effectiveStop = eff;
  } else if (next.trailingActive) {
    const trail = next.highestReference.mul(new Decimal(100).sub(cfg.trailingDistancePct)).div(100);
    if (trail.gt(next.effectiveStop)) {
      events.push({ kind: 'RAISED', previous: next.effectiveStop, next: trail, reference });
      next.effectiveStop = trail;
    }
  }
  if (reference.lte(next.effectiveStop)) {
    events.push({ kind: 'TRIGGERED', previous: next.effectiveStop, next: next.effectiveStop, reference });
  }
  return { state: next, events };
}
