import { describe, expect, it } from 'vitest';
import { DEFAULT_STRATEGY } from '@alpha-desk/config';
import { Decimal, usdToMicro } from '@alpha-desk/shared';
import {
  applyReference,
  authorize,
  canReset,
  evaluateLossBreakers,
  evaluateRouteFailures,
  initialStop,
  sizePosition,
  validateAuthorization,
  type RiskContext,
  type StoredAuthorization,
} from '../src/index.ts';

const R = DEFAULT_STRATEGY.risk;
const NOW = 1_800_000_000_000;
const sizingInput = (o: Partial<Parameters<typeof sizePosition>[0]> = {}) => ({
  equityMicro: usdToMicro(10_000),
  cashMicro: usdToMicro(10_000),
  openExposureMicro: 0n,
  estEntryCostPct: new Decimal(1),
  estExitCostPct: new Decimal(1),
  liquidityUsd: new Decimal(1_000_000),
  feeReserveMicro: 0n,
  ...o,
});

describe('position sizing', () => {
  it('uses the risk budget over the full loss fraction (stop + costs + buffer)', () => {
    const s = sizePosition(sizingInput(), R);
    // 0.5% of 10k = $50; loss fraction = 6 + 1 + 1 + 1.5 = 9.5% → $526.315789
    expect(s.lossFraction).toBe('0.095000');
    expect(s.notionalMicro).toBe(526_315_789n);
    expect(s.binding).toBe('riskSizedMicro');
  });
  it('never exceeds 8% of equity', () => {
    const s = sizePosition(sizingInput({ estEntryCostPct: new Decimal(0), estExitCostPct: new Decimal(0) }), {
      ...R,
      initialStopPct: 1,
      executionBufferPct: 0,
    });
    expect(s.notionalMicro).toBe(usdToMicro(800));
    expect(s.binding).toBe('allocationMicro');
  });
  it('respects liquidity, cash and remaining capacity', () => {
    expect(sizePosition(sizingInput({ liquidityUsd: new Decimal(10_000) }), R).binding).toBe(
      'liquidityMicro',
    );
    expect(sizePosition(sizingInput({ cashMicro: usdToMicro(100) }), R).notionalMicro).toBe(usdToMicro(100));
    const full = sizePosition(sizingInput({ openExposureMicro: usdToMicro(2_300) }), R);
    expect(full.notionalMicro).toBe(usdToMicro(100));
    expect(sizePosition(sizingInput({ openExposureMicro: usdToMicro(3_000) }), R).notionalMicro).toBe(0n);
  });
});

describe('stops', () => {
  const entry = new Decimal('1.00');
  const st = {
    entryReference: entry,
    effectiveStop: initialStop(entry, R),
    trailingActive: false,
    highestReference: entry,
  };
  it('initialises at 94% of the entry reference', () => {
    expect(st.effectiveStop.toString()).toBe('0.94');
  });
  it('activates trailing at +12% and trails 6% below the high', () => {
    const a = applyReference(st, new Decimal('1.11'), R);
    expect(a.state.trailingActive).toBe(false);
    const b = applyReference(a.state, new Decimal('1.12'), R);
    expect(b.state.trailingActive).toBe(true);
    expect(b.state.effectiveStop.toString()).toBe('1.0528');
    const c = applyReference(b.state, new Decimal('1.30'), R);
    expect(c.state.effectiveStop.toString()).toBe('1.222');
  });
  it('never lowers the effective stop', () => {
    let s = applyReference(st, new Decimal('1.30'), R).state;
    const before = s.effectiveStop;
    s = applyReference(s, new Decimal('1.25'), R).state;
    expect(s.effectiveStop.gte(before)).toBe(true);
    for (const p of ['1.27', '1.23', '1.29', '1.10']) {
      const n = applyReference(s, new Decimal(p), R).state;
      expect(n.effectiveStop.gte(s.effectiveStop)).toBe(true);
      s = n;
    }
  });
  it('triggers at or below the stop', () => {
    expect(applyReference(st, new Decimal('0.94'), R).events.some((e) => e.kind === 'TRIGGERED')).toBe(true);
    expect(applyReference(st, new Decimal('0.9401'), R).events.some((e) => e.kind === 'TRIGGERED')).toBe(
      false,
    );
    const trailing = applyReference(st, new Decimal('1.20'), R).state;
    expect(applyReference(trailing, new Decimal('1.128'), R).events.some((e) => e.kind === 'TRIGGERED')).toBe(
      true,
    );
  });
  it('rejects invalid references', () => {
    expect(() => applyReference(st, new Decimal(0), R)).toThrow();
  });
});

describe('circuit breakers', () => {
  it('trips the daily loss breaker at 3% of opening-day equity', () => {
    expect(
      evaluateLossBreakers(
        {
          equityMicro: usdToMicro(9_701),
          dayOpenEquityMicro: usdToMicro(10_000),
          peakEquityMicro: usdToMicro(10_000),
        },
        R,
      ),
    ).toEqual([]);
    expect(
      evaluateLossBreakers(
        {
          equityMicro: usdToMicro(9_700),
          dayOpenEquityMicro: usdToMicro(10_000),
          peakEquityMicro: usdToMicro(10_000),
        },
        R,
      ).map((t) => t.breaker),
    ).toEqual(['DAILY_LOSS']);
  });
  it('trips the drawdown shutdown at 8% from peak', () => {
    const t = evaluateLossBreakers(
      {
        equityMicro: usdToMicro(11_040),
        dayOpenEquityMicro: usdToMicro(11_000),
        peakEquityMicro: usdToMicro(12_000),
      },
      R,
    );
    expect(t.map((x) => x.breaker)).toEqual(['MAX_DRAWDOWN']);
  });
  it('pauses after repeated route failures in the window', () => {
    expect(evaluateRouteFailures([NOW - 1, NOW - 2, NOW - 3, NOW - 4], NOW, R)).toBeNull();
    expect(evaluateRouteFailures([NOW - 1, NOW - 2, NOW - 3, NOW - 4, NOW - 5], NOW, R)?.breaker).toBe(
      'ROUTE_FAILURES',
    );
    expect(evaluateRouteFailures(Array(9).fill(NOW - 31 * 60_000), NOW, R)).toBeNull();
  });
  it('requires the documented reset procedure', () => {
    const base = {
      reason: 'reviewed the losing trades',
      equity: { equityMicro: 1n, dayOpenEquityMicro: 1n, peakEquityMicro: 1n },
      cfg: R,
      dataHealthy: true,
      integrityOk: true,
      today: '2026-10-30',
      trippedDay: '2026-10-29',
    };
    expect(canReset('DAILY_LOSS', { ...base, phrase: 'reset' }).allowed).toBe(false);
    expect(canReset('DAILY_LOSS', { ...base, phrase: 'RESET DAILY_LOSS', reason: 'x' }).allowed).toBe(false);
    expect(
      canReset('DAILY_LOSS', { ...base, phrase: 'RESET DAILY_LOSS', trippedDay: '2026-10-30' }).allowed,
    ).toBe(false);
    expect(canReset('DAILY_LOSS', { ...base, phrase: 'RESET DAILY_LOSS' }).allowed).toBe(true);
    expect(
      canReset('DATA_OUTAGE', { ...base, phrase: 'RESET DATA_OUTAGE', dataHealthy: false }).allowed,
    ).toBe(false);
    expect(
      canReset('DB_INTEGRITY', { ...base, phrase: 'RESET DB_INTEGRITY', integrityOk: false }).allowed,
    ).toBe(false);
  });
});

describe('authorization', () => {
  const ctx = (o: Partial<RiskContext> = {}): RiskContext => ({
    now: NOW,
    mode: 'PAPER_AUTONOMOUS',
    manualApproval: false,
    activeBreakers: [],
    entriesPausedReason: null,
    openPositions: 0,
    openMints: new Set(),
    tradesToday: 0,
    analystValidUntil: NOW + 60_000,
    quoteObservedAt: NOW - 1000,
    configVersion: 'c1',
    activeConfigVersion: 'c1',
    ...o,
  });
  const req = {
    mint: 'M',
    portfolioId: 'P',
    proposedOrderId: 'O',
    referencePriceUsd: new Decimal(1),
    sizing: sizingInput(),
  };
  it('authorizes within limits', () => {
    const v = authorize(req, ctx(), R);
    expect(v.decision).toBe('RISK_AUTHORIZED');
    expect(v.maxNotionalMicro).toBe(526_315_789n);
    expect(v.maxNotionalMicro <= usdToMicro(800)).toBe(true);
  });
  it('pauses for breakers, emergency, outages and superseded config', () => {
    expect(authorize(req, ctx({ activeBreakers: ['DAILY_LOSS'] }), R).decision).toBe('RISK_PAUSED');
    expect(authorize(req, ctx({ mode: 'EMERGENCY_PAUSED' }), R).decision).toBe('RISK_PAUSED');
    expect(authorize(req, ctx({ mode: 'DISCOVERY_ONLY' }), R).decision).toBe('RISK_PAUSED');
    expect(authorize(req, ctx({ entriesPausedReason: 'outage' }), R).decision).toBe('RISK_PAUSED');
    expect(authorize(req, ctx({ activeConfigVersion: 'c2' }), R).decision).toBe('RISK_PAUSED');
  });
  it('rejects duplicates, too many positions, stale quotes and costly entries', () => {
    expect(authorize(req, ctx({ openMints: new Set(['M']) }), R).decision).toBe('RISK_REJECTED');
    expect(authorize(req, ctx({ openPositions: 3 }), R).decision).toBe('RISK_REJECTED');
    expect(authorize(req, ctx({ tradesToday: 12 }), R).decision).toBe('RISK_REJECTED');
    expect(authorize(req, ctx({ quoteObservedAt: NOW - 16_000 }), R).decision).toBe('RISK_REJECTED');
    expect(authorize(req, ctx({ analystValidUntil: NOW - 1 }), R).decision).toBe('RISK_REJECTED');
    expect(
      authorize({ ...req, sizing: sizingInput({ estEntryCostPct: new Decimal(3.5) }) }, ctx(), R).decision,
    ).toBe('RISK_REJECTED');
  });
  const stored: StoredAuthorization = {
    id: 'A',
    portfolioId: 'P',
    mint: 'M',
    proposedOrderId: 'O',
    maxNotionalMicro: 500n,
    referencePriceUsd: new Decimal(1),
    configVersion: 'c1',
    decision: 'RISK_AUTHORIZED',
    expiresAt: NOW + 10_000,
    consumedAt: null,
    invalidatedAt: null,
  };
  const use = {
    now: NOW,
    mint: 'M',
    portfolioId: 'P',
    proposedOrderId: 'O',
    notionalMicro: 500n,
    currentReferencePriceUsd: new Decimal('1.01'),
    activeConfigVersion: 'c1',
  };
  it('is single use, short lived and bound to mint, order, portfolio, notional and config', () => {
    expect(validateAuthorization(stored, use, R).valid).toBe(true);
    expect(validateAuthorization({ ...stored, consumedAt: NOW - 1 }, use, R).valid).toBe(false);
    expect(validateAuthorization(stored, { ...use, now: NOW + 10_000 }, R).valid).toBe(false);
    expect(validateAuthorization(stored, { ...use, mint: 'X' }, R).valid).toBe(false);
    expect(validateAuthorization(stored, { ...use, portfolioId: 'X' }, R).valid).toBe(false);
    expect(validateAuthorization(stored, { ...use, proposedOrderId: 'X' }, R).valid).toBe(false);
    expect(validateAuthorization(stored, { ...use, notionalMicro: 501n }, R).valid).toBe(false);
    expect(validateAuthorization(stored, { ...use, activeConfigVersion: 'c2' }, R).valid).toBe(false);
    expect(
      validateAuthorization(stored, { ...use, currentReferencePriceUsd: new Decimal('1.04') }, R).valid,
    ).toBe(false);
    expect(validateAuthorization({ ...stored, decision: 'RISK_REJECTED' }, use, R).valid).toBe(false);
    expect(validateAuthorization(null, use, R).valid).toBe(false);
  });
});
