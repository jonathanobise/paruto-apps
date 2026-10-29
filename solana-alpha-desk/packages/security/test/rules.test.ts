import { describe, expect, it } from 'vitest';
import { DEFAULT_STRATEGY } from '@alpha-desk/config';
import {
  aggregateFilter,
  analyseBundle,
  analyseDeveloper,
  analyseHolders,
  evaluateRules,
  runFilter,
  type SecurityEvidence,
} from '../src/index.ts';
import { passingEvidence, T_NOW } from '../../../tests/fixtures/security-evidence.ts';
import { Decimal } from '@alpha-desk/shared';
import type { ParsedTx } from '@alpha-desk/providers';

const cfg = DEFAULT_STRATEGY.filter;
const outcomeOf = (e: SecurityEvidence, id: string) =>
  evaluateRules(e, cfg, T_NOW).find((r) => r.ruleId === id)!.outcome;

describe('Filter rules', () => {
  it('approves only when every rule passes, with a full evidence matrix', () => {
    const d = runFilter(passingEvidence(), cfg, T_NOW);
    expect(d.outcome).toBe('FILTER_APPROVED');
    expect(d.results).toHaveLength(18);
    expect(d.validUntil).not.toBeNull();
    for (const r of d.results.filter((x) => x.ruleId !== 'F015' && x.ruleId !== 'F018'))
      expect(r.evidenceIds.length).toBeGreaterThan(0);
  });
  it('F001/F002 fail on active authorities', () => {
    const e = passingEvidence();
    e.mintFacts.value!.mintAuthority = 'Auth111111111111111111111111111111111111111';
    expect(outcomeOf(e, 'F001')).toBe('FAIL');
    const f = passingEvidence();
    f.mintFacts.value!.freezeAuthority = 'Auth111111111111111111111111111111111111111';
    expect(outcomeOf(f, 'F002')).toBe('FAIL');
    expect(outcomeOf(f, 'F016')).toBe('FAIL');
  });
  it('F003 fails on withdrawable LP and is unverified without an adapter', () => {
    const e = passingEvidence();
    e.pool.value!.lp!.status = 'FAIL';
    expect(outcomeOf(e, 'F003')).toBe('FAIL');
    const u = passingEvidence();
    u.pool.value!.decoded = null;
    expect(outcomeOf(u, 'F003')).toBe('UNVERIFIED');
    expect(outcomeOf(u, 'F017')).toBe('FAIL');
  });
  it('F004 liquidity threshold at $40,000 uses on-chain value', () => {
    const e = passingEvidence();
    e.pool.value!.onChainLiquidityUsd = '39999.99';
    expect(outcomeOf(e, 'F004')).toBe('FAIL');
    e.pool.value!.onChainLiquidityUsd = '40000';
    expect(outcomeOf(e, 'F004')).toBe('PASS');
    const n = passingEvidence();
    n.pool.value!.onChainLiquidityUsd = null;
    expect(outcomeOf(n, 'F004')).toBe('UNVERIFIED');
  });
  it('F005 volume and F010 price rise thresholds', () => {
    const e = passingEvidence();
    e.market.value!.volume1hUsd = 49_999;
    expect(outcomeOf(e, 'F005')).toBe('FAIL');
    e.market.value!.volume1hUsd = 50_000;
    expect(outcomeOf(e, 'F005')).toBe('PASS');
    e.market.value!.priceChange1hPct = 80.01;
    expect(outcomeOf(e, 'F010')).toBe('FAIL');
    e.market.value!.priceChange1hPct = 80;
    expect(outcomeOf(e, 'F010')).toBe('PASS');
  });
  it('F011 rejects dangerous Token-2022 extensions and allows metadata ones', () => {
    const e = passingEvidence();
    e.mintFacts.value!.extensions = [
      { name: 'metadataPointer', state: {} },
      { name: 'tokenMetadata', state: {} },
    ];
    expect(outcomeOf(e, 'F011')).toBe('PASS');
    for (const bad of ['permanentDelegate', 'transferHook', 'transferFeeConfig', 'someFutureExtension']) {
      e.mintFacts.value!.extensions = [{ name: bad, state: {} }];
      expect(outcomeOf(e, 'F011')).toBe('FAIL');
    }
    e.mintFacts.value!.extensions = [{ name: 'permanentDelegate', state: {} }];
    expect(outcomeOf(e, 'F016')).toBe('FAIL');
  });
  it('F012 fails without a route or with excessive impact; provider errors are ERROR not PASS', () => {
    const e = passingEvidence();
    e.route.value!.ok = false;
    expect(outcomeOf(e, 'F012')).toBe('FAIL');
    const i = passingEvidence();
    i.route.value!.priceImpactPct = '5.01';
    expect(outcomeOf(i, 'F012')).toBe('FAIL');
    const x = passingEvidence();
    x.route = { status: 'ERROR', value: null, evidenceIds: [], observedAt: null, error: 'timeout' };
    expect(outcomeOf(x, 'F012')).toBe('ERROR');
    expect(runFilter(x, cfg, T_NOW).outcome).toBe('FILTER_ERROR');
  });
  it('F013 marks missing evidence and F015 stale evidence as unverified', () => {
    const e = passingEvidence();
    e.market = { status: 'UNAVAILABLE', value: null, evidenceIds: [], observedAt: null };
    expect(outcomeOf(e, 'F013')).toBe('UNVERIFIED');
    expect(runFilter(e, cfg, T_NOW).outcome).not.toBe('FILTER_APPROVED');
    const s = passingEvidence();
    expect(evaluateRules(s, cfg, T_NOW + 200_000).find((r) => r.ruleId === 'F015')!.outcome).toBe(
      'UNVERIFIED',
    );
  });
  it('F014 fails on material provider discrepancies and never averages', () => {
    const e = passingEvidence();
    e.market.value!.liquidityUsd = 200_000; // on-chain says 100k
    expect(outcomeOf(e, 'F014')).toBe('FAIL');
    const f = passingEvidence();
    f.market.value!.fdvUsd = 2_000_000; // supply × price = 1M
    expect(outcomeOf(f, 'F014')).toBe('FAIL');
  });
  it('F018 is NOT_REQUIRED only when configured so, otherwise blocks', () => {
    expect(outcomeOf(passingEvidence(), 'F018')).toBe('NOT_REQUIRED');
    const r = evaluateRules(passingEvidence(), { ...cfg, complianceScreeningRequired: true }, T_NOW).find(
      (x) => x.ruleId === 'F018',
    )!;
    expect(r.outcome).toBe('UNVERIFIED');
  });
  it('missing facts never produce PASS for any rule', () => {
    const e = passingEvidence();
    const gone = { status: 'UNAVAILABLE' as const, value: null, evidenceIds: [], observedAt: null };
    Object.assign(e, {
      mintFacts: gone,
      pool: gone,
      market: gone,
      route: gone,
      holders: gone,
      developer: gone,
      bundle: gone,
      corroboration: gone,
    });
    const res = evaluateRules(e, cfg, T_NOW);
    expect(res.filter((r) => r.outcome === 'PASS')).toEqual([]);
    expect(aggregateFilter(res)).toBe('FILTER_UNVERIFIED');
  });
});

describe('holder concentration', () => {
  const base = {
    totalSupply: 1000n,
    owners: new Map(),
    poolVaults: new Set(['vault']),
    poolAddresses: new Set<string>(),
    developerWallets: new Set<string>(),
    maxTop10Pct: 25,
    requireClustering: true,
  };
  const wallet = (n: number) => ({
    address: `w${n}`,
    exists: true,
    programOwner: '11111111111111111111111111111111',
    executable: false,
  });
  it('excludes pool vaults and burn addresses from circulating supply and fails on the lower bound', () => {
    const owners = new Map([
      ['w1', wallet(1)],
      ['w2', wallet(2)],
    ]);
    const r = analyseHolders({
      ...base,
      owners,
      holdings: [
        { tokenAccount: 'vault', owner: 'poolpda', amount: 500n },
        { tokenAccount: 'b', owner: '1nc1nerator11111111111111111111111111111111', amount: 100n },
        { tokenAccount: 'a1', owner: 'w1', amount: 80n },
        { tokenAccount: 'a2', owner: 'w2', amount: 40n },
      ],
    });
    expect(r.circulatingSupply).toBe('400');
    expect(r.top10PctLowerBound).toBe('30.0000');
    expect(r.status).toBe('FAIL');
  });
  it('groups accounts by owner before ranking', () => {
    const owners = new Map([['w1', wallet(1)]]);
    const r = analyseHolders({
      ...base,
      owners,
      holdings: [
        { tokenAccount: 'a1', owner: 'w1', amount: 100n },
        { tokenAccount: 'a2', owner: 'w1', amount: 200n },
      ],
    });
    expect(r.top10PctLowerBound).toBe('30.0000');
  });
  it('is UNVERIFIED without clustering even when the raw bound is low', () => {
    const owners = new Map([['w1', wallet(1)]]);
    const r = analyseHolders({
      ...base,
      owners,
      holdings: [{ tokenAccount: 'a1', owner: 'w1', amount: 10n }],
    });
    expect(r.status).toBe('UNVERIFIED');
  });
  it('clusters merge wallets and can turn a pass into a fail', () => {
    const owners = new Map(Array.from({ length: 20 }, (_, i) => [`w${i}`, wallet(i)] as const));
    const holdings = Array.from({ length: 20 }, (_, i) => ({
      tokenAccount: `a${i}`,
      owner: `w${i}`,
      amount: 20n,
    }));
    const separate = analyseHolders({
      ...base,
      owners,
      holdings,
      clusters: new Map(holdings.map((h) => [h.owner, h.owner])),
    });
    expect(separate.status).toBe('PASS');
    const merged = analyseHolders({
      ...base,
      owners,
      holdings,
      clusters: new Map(holdings.map((h) => [h.owner, 'one-funder'])),
    });
    expect(merged.status).toBe('FAIL');
    // A wallet whose funding could not be traced may belong to any cluster: under the limit is not a pass.
    const partly = analyseHolders({
      ...base,
      owners,
      holdings,
      clusters: new Map(holdings.slice(1).map((h) => [h.owner, h.owner])),
      untracedWallets: ['w0'],
    });
    expect(partly.status).toBe('UNVERIFIED');
    expect(partly.notes.join(' ')).toContain('lower bound');
  });
});

describe('developer and bundle analysis', () => {
  const tx = (o: Partial<ParsedTx>) => ({
    signature: 's',
    slot: 1,
    timestamp: 1,
    type: 'TRANSFER',
    source: null,
    feePayer: 'dev',
    failed: false,
    nativeTransfers: [],
    tokenTransfers: [],
    ...o,
  });
  it('fails on deployer holdings above the limit even without the graph', () => {
    const r = analyseDeveloper({
      mint: 'm',
      deployer: 'dev',
      deployerSource: 't',
      circulatingSupply: 1000n,
      deployerHoldings: 40n,
      linkedHoldings: null,
      deployerHistory: null,
      maxOwnershipPct: 3,
    });
    expect(r.ownershipStatus).toBe('FAIL');
    expect(r.historyStatus).toBe('UNVERIFIED');
  });
  it('requires a complete history to pass and cites rug evidence', () => {
    const clean = analyseDeveloper({
      mint: 'm',
      deployer: 'dev',
      deployerSource: 't',
      circulatingSupply: 1000n,
      deployerHoldings: 0n,
      linkedHoldings: new Map(),
      deployerHistory: { txs: [], complete: true },
      maxOwnershipPct: 3,
    });
    expect(clean.ownershipStatus).toBe('PASS');
    expect(clean.historyStatus).toBe('PASS');
    const incomplete = analyseDeveloper({
      mint: 'm',
      deployer: 'dev',
      deployerSource: 't',
      circulatingSupply: 1000n,
      deployerHoldings: 0n,
      linkedHoldings: new Map(),
      deployerHistory: { txs: [], complete: false },
      maxOwnershipPct: 3,
    });
    expect(incomplete.historyStatus).toBe('UNVERIFIED');
    const rug = analyseDeveloper({
      mint: 'm',
      deployer: 'dev',
      deployerSource: 't',
      circulatingSupply: 1000n,
      deployerHoldings: 0n,
      linkedHoldings: new Map(),
      deployerHistory: {
        txs: [
          tx({
            signature: 'rugsig',
            type: 'WITHDRAW_LIQUIDITY',
            tokenTransfers: [{ from: 'pool', to: 'dev', mint: 'old', uiAmount: '1' }],
          }),
        ],
        complete: true,
      },
      maxOwnershipPct: 3,
    });
    expect(rug.historyStatus).toBe('FAIL');
    expect(rug.rugFindings[0]!.signature).toBe('rugsig');
  });
  it('counts linked wallets that received supply from the deployer', () => {
    const r = analyseDeveloper({
      mint: 'm',
      deployer: 'dev',
      deployerSource: 't',
      circulatingSupply: 1000n,
      deployerHoldings: 10n,
      linkedHoldings: new Map([['friend', 30n]]),
      deployerHistory: {
        txs: [
          tx({ signature: 'x', tokenTransfers: [{ from: 'dev', to: 'friend', mint: 'm', uiAmount: '30' }] }),
        ],
        complete: true,
      },
      maxOwnershipPct: 3,
    });
    expect(r.ownershipPct).toBe('4.0000');
    expect(r.ownershipStatus).toBe('FAIL');
  });
  it('does not equate early buying with bundling', () => {
    const buys = Array.from({ length: 5 }, (_, i) => ({
      signature: `s${i}`,
      slot: 100,
      timestamp: 1,
      buyer: `b${i}`,
      feePayer: `b${i}`,
      uiAmount: new Decimal(30),
    }));
    const independent = analyseBundle({
      buys,
      totalSupplyUi: new Decimal(1000),
      funders: new Map(buys.map((b) => [b.buyer, `f${b.buyer}`])),
      fundersComplete: true,
      windowSeconds: 120,
      maxBundledPct: 10,
    });
    expect(independent.status).toBe('PASS');
    expect(independent.bundledPct).toBe('0.0000');
    const linked = analyseBundle({
      buys,
      totalSupplyUi: new Decimal(1000),
      funders: new Map(buys.map((b) => [b.buyer, 'same'])),
      fundersComplete: true,
      windowSeconds: 120,
      maxBundledPct: 10,
    });
    expect(linked.status).toBe('FAIL');
    expect(linked.bundledPct).toBe('15.0000');
    expect(
      analyseBundle({
        buys: null,
        totalSupplyUi: new Decimal(1000),
        funders: null,
        fundersComplete: false,
        windowSeconds: 120,
        maxBundledPct: 10,
      }).status,
    ).toBe('UNVERIFIED');
  });
  it('passes untraced launch buying only when all of it together is within the limit', () => {
    const buys = (amount: number) =>
      Array.from({ length: 5 }, (_, i) => ({
        signature: `s${i}`,
        slot: 100,
        timestamp: 1,
        buyer: `b${i}`,
        feePayer: `b${i}`,
        uiAmount: new Decimal(amount),
      }));
    const untraced = (amount: number) =>
      analyseBundle({
        buys: buys(amount),
        totalSupplyUi: new Decimal(1000),
        funders: new Map(),
        fundersComplete: false,
        windowSeconds: 120,
        maxBundledPct: 10,
      });
    expect(untraced(10).status).toBe('PASS'); // 5 × 10 = 5% of supply in total
    expect(untraced(30).status).toBe('UNVERIFIED'); // 15% in total could be one group
  });
});
