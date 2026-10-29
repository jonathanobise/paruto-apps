import { describe, expect, it } from 'vitest';
import {
  assertTransition,
  buildHandoff,
  HandoffEventSchema,
  isSolanaAddress,
  base58Decode,
  base58Encode,
  usdToMicro,
  microToUsd,
  toBaseUnits,
  fromBaseUnits,
  canonicalJson,
  TERMINAL_STATES,
  TRANSITIONS,
} from '../src/index.ts';

const MINT = 'HMYd9tosnUXuNHmq7pXmoePRVBLBBjA3JBfydq6upump';

describe('state machine', () => {
  it('allows only listed transitions by permitted agents', () => {
    expect(() => assertTransition(null, 'DISCOVERED', 'SCOUT')).not.toThrow();
    expect(() => assertTransition('FILTER_PENDING', 'FILTER_APPROVED', 'FILTER')).not.toThrow();
    expect(() => assertTransition('FILTER_PENDING', 'FILTER_APPROVED', 'ANALYST')).toThrow(/may not/);
    expect(() => assertTransition('DISCOVERED', 'POSITION_OPEN', 'EXECUTOR')).toThrow(/illegal/);
    expect(() => assertTransition('RISK_PENDING', 'RISK_AUTHORIZED', 'ANALYST')).toThrow();
    expect(() => assertTransition('RISK_AUTHORIZED', 'PAPER_ORDER_PENDING', 'RISK')).toThrow();
  });
  it('never leaves a terminal state', () => {
    for (const s of TERMINAL_STATES) expect(TRANSITIONS.some((e) => e.from === s)).toBe(false);
    expect(() => assertTransition('FILTER_REJECTED', 'ANALYST_PENDING', 'FILTER')).toThrow(/terminal/);
  });
  it('has no path from a non-approved filter outcome to the analyst', () => {
    for (const s of ['FILTER_REJECTED', 'FILTER_UNVERIFIED', 'FILTER_ERROR'] as const) {
      expect(TRANSITIONS.some((e) => e.from === s && e.to === 'ANALYST_PENDING')).toBe(false);
    }
  });
  it('only the Executor creates orders and fills, only Risk authorizes', () => {
    for (const e of TRANSITIONS) {
      if (['PAPER_ORDER_PENDING', 'PAPER_FILLED', 'POSITION_OPEN', 'POSITION_CLOSED'].includes(e.to))
        expect(e.by).toEqual(['EXECUTOR']);
      if (e.to === 'RISK_AUTHORIZED') expect(e.by).toEqual(['RISK']);
    }
  });
});

describe('handoff contract', () => {
  const base = {
    correlationId: 'cor_0000000001',
    candidateId: 'cd_0000000001',
    tokenMint: MINT,
    source: 'FILTER' as const,
    destination: 'ANALYST' as const,
    eventType: 'FILTER_DECIDED',
    previous: 'FILTER_PENDING' as const,
    next: 'FILTER_APPROVED' as const,
    observedAt: 1_800_000_000_000,
    generatedAt: 1_800_000_001_000,
    configVersion: 'cfg_test',
    strategyVersion: 'v1',
  };
  it('builds a valid event with every required field', async () => {
    const e = await buildHandoff(base);
    expect(HandoffEventSchema.parse(e)).toBeTruthy();
    for (const k of [
      'event_id',
      'schema_version',
      'correlation_id',
      'candidate_id',
      'token_mint',
      'source_agent',
      'destination_agent',
      'event_type',
      'previous_state',
      'next_state',
      'observed_at',
      'generated_at',
      'expires_at',
      'evidence_ids',
      'config_version',
      'strategy_version',
      'idempotency_key',
      'payload',
    ]) {
      expect(e).toHaveProperty(k);
    }
  });
  it('derives the same idempotency key for a redelivered transition', async () => {
    const a = await buildHandoff(base);
    const b = await buildHandoff({ ...base, generatedAt: base.generatedAt + 5000 });
    expect(a.idempotency_key).toBe(b.idempotency_key);
    expect(a.event_id).not.toBe(b.event_id);
  });
  it('rejects a transition from an unpermitted agent', async () => {
    await expect(buildHandoff({ ...base, source: 'SCOUT' })).rejects.toThrow();
  });
  it('rejects expiry before generation', async () => {
    await expect(buildHandoff({ ...base, expiresAt: base.generatedAt - 1 })).rejects.toThrow();
  });
});

describe('money and encoding', () => {
  it('converts USD to integer micro units without floating point', () => {
    expect(usdToMicro('0.1')).toBe(100_000n);
    expect(usdToMicro('0.3') - usdToMicro('0.1') - usdToMicro('0.2')).toBe(0n);
    expect(microToUsd(123_456_789n).toString()).toBe('123.456789');
    expect(usdToMicro('1.0000009')).toBe(1_000_000n); // floor for cash
  });
  it('handles token base units beyond 2^53', () => {
    const big = toBaseUnits('123456789012.123456789', 9);
    expect(big).toBe(123456789012123456789n);
    expect(fromBaseUnits(big, 9).toString()).toBe('123456789012.123456789');
  });
  it('validates Solana addresses', () => {
    expect(isSolanaAddress(MINT)).toBe(true);
    expect(isSolanaAddress('So11111111111111111111111111111111111111112')).toBe(true);
    expect(isSolanaAddress('not-a-mint')).toBe(false);
    expect(isSolanaAddress('0'.repeat(44))).toBe(false);
    const bytes = base58Decode(MINT)!;
    expect(base58Encode(bytes)).toBe(MINT);
  });
  it('canonical JSON sorts keys and stringifies bigint', () => {
    expect(canonicalJson({ b: 1n, a: [2, { d: 1, c: 2 }] })).toBe('{"a":[2,{"c":2,"d":1}],"b":"1"}');
  });
});
