import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { assessLpSafety, decodePool, orientPool } from '../src/index.ts';

const fx = JSON.parse(
  readFileSync(new URL('../../../tests/fixtures/mainnet-pools.json', import.meta.url), 'utf8'),
) as { pools: Array<{ kind: string; owner: string; mint: string; data: string }> };
const bytes = (b64: string) => Uint8Array.from(Buffer.from(b64, 'base64'));

describe('pool adapters (real mainnet account bytes)', () => {
  for (const p of fx.pools) {
    it(`decodes ${p.kind} and finds the traded mint`, () => {
      const d = decodePool(p.owner, bytes(p.data));
      expect(d).not.toBeNull();
      expect(orientPool(d!, p.mint)).not.toBeNull();
      expect(d!.lpSupplyTracked > 0n).toBe(true);
    });
  }
  it('returns null for an unknown program', () => {
    expect(decodePool('whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', new Uint8Array(800))).toBeNull();
  });
});

describe('LP withdrawal-control model', () => {
  const pool = decodePool(fx.pools[0]!.owner, bytes(fx.pools[0]!.data))!;
  const tracked = pool.lpSupplyTracked;
  it('passes when all LP was burned', () => {
    expect(assessLpSafety(pool, 0n, [], 95).status).toBe('PASS');
  });
  it('counts burn-address holdings as non-withdrawable', () => {
    const r = assessLpSafety(
      pool,
      tracked,
      [{ tokenAccount: 'a', owner: '1nc1nerator11111111111111111111111111111111', amount: tracked }],
      95,
    );
    expect(r.status).toBe('PASS');
  });
  it('fails when a wallet can redeem more than the allowance', () => {
    const r = assessLpSafety(
      pool,
      tracked / 10n,
      [{ tokenAccount: 'a', owner: 'Wallet11111111111111111111111111111111111111', amount: tracked / 10n }],
      95,
    );
    expect(r.status).toBe('FAIL');
    expect(Number(r.nonWithdrawablePct)).toBeCloseTo(90, 0);
  });
  it('treats lock programs as withdrawable (fail closed) and cannot verify impossible supplies', () => {
    expect(
      assessLpSafety(
        pool,
        tracked,
        [{ tokenAccount: 'a', owner: 'LockrWmn6K5twhz3y9w1dQERbmgSaRkfnTeTKbpofwE', amount: tracked }],
        95,
      ).status,
    ).toBe('FAIL');
    expect(assessLpSafety(pool, tracked + 1n, [], 95).status).toBe('UNVERIFIED');
    expect(assessLpSafety({ ...pool, lpSupplyTracked: 0n }, 0n, [], 95).status).toBe('UNVERIFIED');
  });
});
