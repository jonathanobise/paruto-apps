// SYNTHETIC TEST FIXTURE — a deterministic, in-memory Solana market used only by tests.
// It implements the provider surface the agents use; nothing here is market data.
import { createHash } from 'node:crypto';
import { DEFAULT_STRATEGY, PROGRAMS, WSOL_MINT, type StrategyConfig } from '@alpha-desk/config';
import { NodeSqliteDb, migrateNodeDb } from '@alpha-desk/db/node';
import type { SqlDb } from '@alpha-desk/db';
import { bootstrap, loadConfig, MemoryEvidenceStore, type Ctx } from '@alpha-desk/orchestrator';
import {
  ProviderError,
  SolPrice,
  type AccountInfo,
  type DexPair,
  type HistoryQuery,
  type Observed,
  type ParsedTx,
  type Providers,
} from '@alpha-desk/providers';
import { base58Encode, ManualClock, silentLogger, type RuntimeMode } from '@alpha-desk/shared';
import { FakeJupiter } from './fake-market.ts';

export const MIGRATIONS = new URL('../../infrastructure/migrations', import.meta.url).pathname;
export const addr = (seed: string) => base58Encode(createHash('sha256').update(seed).digest());
export const SYSTEM = PROGRAMS.system;

const obs = <T>(data: T, at: number, endpoint = 'fake', slot?: number): Observed<T> => ({
  data,
  provenance: {
    provider: 'fake',
    endpoint,
    method: 'GET',
    observedAt: at,
    ingestedAt: at,
    latencyMs: 1,
    status: 200,
    sha256: createHash('sha256')
      .update(
        JSON.stringify(data, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)) +
          endpoint +
          Math.random(),
      )
      .digest('hex'),
    raw: '{"synthetic":true}',
    slot,
  },
});

export interface TokenSpec {
  seed: string;
  priceUsd: number;
  supplyTokens: number; // whole tokens
  decimals: number;
  poolTokens: number; // tokens in pool
  ageMinutes: number;
  change: { m5: number; h1: number; h6: number; h24: number };
  volume: { m5: number; h1: number; h6: number; h24: number };
  mintAuthority?: string | null;
  freezeAuthority?: string | null;
  extensions?: Array<{ extension: string; state?: Record<string, unknown> }>;
  lpBurned?: boolean;
  holderCount?: number;
  deployerHoldingTokens?: number;
  /** A PumpSwap pool created before pools recorded coin_creator (the deployer must come from the mint). */
  legacyPool?: boolean;
  /** Holder wallets whose history shows no SOL funding (e.g. funded by a service wallet). */
  holdersUnfunded?: boolean;
}

export interface WorldToken {
  spec: TokenSpec;
  mint: string;
  pair: string;
  lpMint: string;
  baseVault: string;
  quoteVault: string;
  deployer: string;
  createdAt: number;
  holders: Array<{ tokenAccount: string; owner: string; amount: bigint }>;
}

export class World {
  readonly clock = new ManualClock(Date.UTC(2026, 9, 29, 12, 0, 0));
  readonly jup = new FakeJupiter(() => this.clock.now());
  readonly tokens = new Map<string, WorldToken>();
  dexOutage = false;
  rpcOutage = false;
  heliusConfigured = true;
  /** Indexer (Helius history) calls made, to check credit-saving behaviour. */
  heliusCalls = 0;
  /** Simulates a spent daily Helius credit budget: billed indexer calls are refused. */
  heliusBudgetSpent = false;
  /** Addresses whose history pages include one transaction the indexer could not parse. */
  readonly unparsedFor = new Set<string>();
  solUsd = 150;

  addToken(spec: TokenSpec): WorldToken {
    const mint = addr(`mint:${spec.seed}`);
    const unit = 10n ** BigInt(spec.decimals);
    const t: WorldToken = {
      spec,
      mint,
      pair: addr(`pair:${spec.seed}`),
      lpMint: addr(`lp:${spec.seed}`),
      baseVault: addr(`bv:${spec.seed}`),
      quoteVault: addr(`qv:${spec.seed}`),
      deployer: addr(`dev:${spec.seed}`),
      createdAt: this.clock.now() - spec.ageMinutes * 60_000,
      holders: [],
    };
    t.holders.push({ tokenAccount: t.baseVault, owner: t.pair, amount: BigInt(spec.poolTokens) * unit });
    for (let i = 0; i < 20; i++)
      t.holders.push({
        tokenAccount: addr(`ta:${spec.seed}:${i}`),
        owner: addr(`holder:${spec.seed}:${i}`),
        amount: (BigInt(spec.supplyTokens - spec.poolTokens) * unit) / 400n,
      });
    this.tokens.set(mint, t);
    this.jup.pools.set(mint, {
      tokenReserve: BigInt(spec.poolTokens) * unit,
      usdReserve: BigInt(Math.round(spec.poolTokens * spec.priceUsd * 1e6)),
      decimals: spec.decimals,
    });
    return t;
  }

  price(t: WorldToken): number {
    return this.jup.price(t.mint);
  }
  setPrice(t: WorldToken, p: number): void {
    this.jup.setPrice(t.mint, p);
  }
  liquidityUsd(t: WorldToken): number {
    return (Number(this.jup.pools.get(t.mint)!.usdReserve) / 1e6) * 2;
  }

  dexPair(t: WorldToken): DexPair {
    const p = this.price(t);
    const fdv = t.spec.supplyTokens * p;
    return {
      chainId: 'solana',
      dexId: 'pumpswap',
      pairAddress: t.pair,
      baseToken: { address: t.mint, symbol: t.spec.seed.toUpperCase(), name: t.spec.seed },
      quoteToken: { address: WSOL_MINT, symbol: 'SOL' },
      priceUsd: p.toPrecision(8),
      priceNative: (p / this.solUsd).toPrecision(8),
      txns: {
        m5: { buys: 40, sells: 20 },
        h1: { buys: 400, sells: 250 },
        h6: { buys: 2000, sells: 1500 },
        h24: { buys: 5000, sells: 4000 },
      },
      volume: t.spec.volume,
      priceChange: t.spec.change,
      liquidity: {
        usd: this.liquidityUsd(t),
        base: t.spec.poolTokens,
        quote: this.liquidityUsd(t) / 2 / this.solUsd,
      },
      fdv,
      marketCap: fdv,
      pairCreatedAt: t.createdAt,
    } as DexPair;
  }

  private poolBytes(t: WorldToken): Uint8Array {
    const d = new Uint8Array(301);
    const put = (o: number, a: string) => d.set(decode(a), o);
    put(11, addr('creator'));
    put(43, t.mint);
    put(75, WSOL_MINT);
    put(107, t.lpMint);
    put(139, t.baseVault);
    put(171, t.quoteVault);
    new DataView(d.buffer).setBigUint64(203, 1_000_000_000n, true);
    if (t.spec.legacyPool) return d.slice(0, 211);
    put(211, t.deployer);
    return d;
  }

  account(address: string, encoding: string): AccountInfo | null {
    for (const t of this.tokens.values()) {
      if (address === t.mint) {
        return {
          address,
          owner: t.spec.extensions?.length ? PROGRAMS.token2022 : PROGRAMS.splToken,
          lamports: 1,
          executable: false,
          data: null,
          parsed: {
            program: 'spl-token',
            type: 'mint',
            info: {
              decimals: t.spec.decimals,
              supply: (BigInt(t.spec.supplyTokens) * 10n ** BigInt(t.spec.decimals)).toString(),
              mintAuthority: t.spec.mintAuthority ?? null,
              freezeAuthority: t.spec.freezeAuthority ?? null,
              isInitialized: true,
              extensions: t.spec.extensions,
            },
          },
        };
      }
      if (address === t.pair) {
        return encoding === 'jsonParsed'
          ? {
              address,
              owner: PROGRAMS.pumpSwapAmm,
              lamports: 1,
              executable: false,
              data: null,
              parsed: { program: 'unknown' },
            }
          : {
              address,
              owner: PROGRAMS.pumpSwapAmm,
              lamports: 1,
              executable: false,
              data: this.poolBytes(t),
              parsed: null,
            };
      }
      if (address === t.quoteVault) {
        const sol = Number(this.jup.pools.get(t.mint)!.usdReserve) / 1e6 / this.solUsd;
        return {
          address,
          owner: PROGRAMS.splToken,
          lamports: 1,
          executable: false,
          data: null,
          parsed: {
            program: 'spl-token',
            type: 'account',
            info: {
              owner: t.pair,
              mint: WSOL_MINT,
              tokenAmount: { amount: BigInt(Math.round(sol * 1e9)).toString(), decimals: 9 },
            },
          },
        };
      }
      const h = t.holders.find((x) => x.tokenAccount === address);
      if (h)
        return {
          address,
          owner: PROGRAMS.splToken,
          lamports: 1,
          executable: false,
          data: null,
          parsed: {
            program: 'spl-token',
            type: 'account',
            info: {
              owner: h.owner,
              mint: t.mint,
              tokenAmount: { amount: h.amount.toString(), decimals: t.spec.decimals },
            },
          },
        };
      if (t.holders.some((x) => x.owner === address && address !== t.pair))
        return {
          address,
          owner: SYSTEM,
          lamports: 1,
          executable: false,
          data: encoding === 'base64' ? new Uint8Array() : null,
          parsed: null,
        };
    }
    return null;
  }

  /** Enhanced-transaction history per address (Helius stand-in). */
  history(address: string): ParsedTx[] {
    const now = this.clock.now();
    for (const t of this.tokens.values()) {
      const holder = address === t.pair ? undefined : t.holders.find((h) => h.owner === address);
      if (holder) {
        if (t.spec.holdersUnfunded) return [];
        return [
          {
            signature: `fund:${address}`,
            slot: 1,
            timestamp: t.createdAt - 86_400_000,
            type: 'TRANSFER',
            source: null,
            feePayer: `funder:${address}`,
            failed: false,
            nativeTransfers: [{ from: addr(`funder:${address}`), to: address, lamports: 1_000_000_000n }],
            tokenTransfers: [],
          },
        ];
      }
      if (address === t.deployer) return [];
      if (address === t.mint)
        return [
          {
            signature: `create:${t.spec.seed}`,
            slot: 1,
            timestamp: t.createdAt - 600_000,
            type: 'CREATE',
            source: null,
            feePayer: t.deployer,
            failed: false,
            nativeTransfers: [],
            tokenTransfers: [],
          },
        ];
      if (address === t.pair) {
        const txs: ParsedTx[] = [];
        for (let i = 0; i < 10; i++) {
          const buyer = addr(`launch:${t.spec.seed}:${i}`);
          txs.push({
            signature: `launch:${i}`,
            slot: 100 + i,
            timestamp: t.createdAt + 5_000 + i * 1000,
            type: 'SWAP',
            source: 'PUMP_AMM',
            feePayer: buyer,
            failed: false,
            nativeTransfers: [],
            tokenTransfers: [{ from: t.baseVault, to: buyer, mint: t.mint, uiAmount: '100000' }],
          });
        }
        for (let i = 0; i < 300; i++) {
          const w = addr(`trader:${t.spec.seed}:${i}`);
          txs.push({
            signature: `buy:${i}`,
            slot: 1000 + i,
            timestamp: now - 50 * 60_000 + i * 1000,
            type: 'SWAP',
            source: 'PUMP_AMM',
            feePayer: w,
            failed: false,
            nativeTransfers: [],
            tokenTransfers: [{ from: t.baseVault, to: w, mint: t.mint, uiAmount: '100000' }],
          });
        }
        for (let i = 0; i < 60; i++) {
          const w = addr(`seller:${t.spec.seed}:${i}`);
          txs.push({
            signature: `sell:${i}`,
            slot: 2000 + i,
            timestamp: now - 40 * 60_000 + i * 1000,
            type: 'SWAP',
            source: 'PUMP_AMM',
            feePayer: w,
            failed: false,
            nativeTransfers: [],
            tokenTransfers: [{ from: w, to: t.baseVault, mint: t.mint, uiAmount: '200000' }],
          });
        }
        return txs.sort((a, b) => b.timestamp - a.timestamp);
      }
      if ([...Array(10).keys()].some((i) => addr(`launch:${t.spec.seed}:${i}`) === address)) {
        return [
          {
            signature: `lfund:${address}`,
            slot: 1,
            timestamp: t.createdAt - 3_600_000,
            type: 'TRANSFER',
            source: null,
            feePayer: 'x',
            failed: false,
            nativeTransfers: [{ from: addr(`lfunder:${address}`), to: address, lamports: 1_000_000_000n }],
            tokenTransfers: [],
          },
        ];
      }
    }
    return [];
  }

  providers(): Providers {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- the fakes close over the world
    const w = this;
    const guardDex = () => {
      if (w.dexOutage) throw new ProviderError('dexscreener', 'NETWORK', 'simulated outage');
    };
    const seen = new Map<string, ParsedTx>();
    const guardRpc = () => {
      if (w.rpcOutage) throw new ProviderError('solana-rpc', 'NETWORK', 'simulated outage');
    };
    const feed = async () => {
      guardDex();
      return obs(
        [...w.tokens.values()].map((t) => ({ chainId: 'solana', tokenAddress: t.mint })),
        w.clock.now(),
        'feed',
      );
    };
    const dex = {
      latestProfiles: feed,
      latestBoosts: feed,
      topBoosts: async () => obs([], w.clock.now()),
      latestTakeovers: async () => obs([], w.clock.now()),
      tokens: async (mints: string[]) => {
        guardDex();
        return obs(
          mints.filter((m) => w.tokens.has(m)).map((m) => w.dexPair(w.tokens.get(m)!)),
          w.clock.now(),
          '/tokens/v1/solana',
        );
      },
      tokenPairs: async (mint: string) =>
        obs(w.tokens.has(mint) ? [w.dexPair(w.tokens.get(mint)!)] : [], w.clock.now()),
      pair: async (pairAddress: string) => {
        guardDex();
        const t = [...w.tokens.values()].find((x) => x.pair === pairAddress);
        return obs(t ? w.dexPair(t) : null, w.clock.now(), '/latest/dex/pairs');
      },
      circuit: 'CLOSED',
    };
    const rpc = {
      url: 'fake',
      getSlot: async () => obs(1, w.clock.now()),
      getAccount: async (a: string, enc: string = 'base64') => (
        guardRpc(),
        obs(w.account(a, enc), w.clock.now(), 'getAccountInfo', 1)
      ),
      getAccounts: async (as: string[], enc: string = 'base64') => (
        guardRpc(),
        obs(
          as.map((a) => w.account(a, enc)),
          w.clock.now(),
          'getMultipleAccounts',
          1,
        )
      ),
      getTokenSupply: async (m: string) => {
        guardRpc();
        const t = [...w.tokens.values()].find((x) => x.lpMint === m || x.mint === m)!;
        if (m === t.lpMint)
          return obs(
            { amount: t.spec.lpBurned === false ? 500_000_000n : 0n, decimals: 9 },
            w.clock.now(),
            'getTokenSupply',
            1,
          );
        return obs(
          { amount: BigInt(t.spec.supplyTokens) * 10n ** BigInt(t.spec.decimals), decimals: t.spec.decimals },
          w.clock.now(),
          'getTokenSupply',
          1,
        );
      },
      getTokenLargestAccounts: async (m: string) => {
        guardRpc();
        const t = [...w.tokens.values()].find((x) => x.lpMint === m || x.mint === m)!;
        if (m === t.lpMint)
          return obs([{ address: addr(`lpholder:${t.spec.seed}`), amount: 500_000_000n }], w.clock.now());
        return obs(
          t.holders.map((h) => ({ address: h.tokenAccount, amount: h.amount })),
          w.clock.now(),
          'getTokenLargestAccounts',
          1,
        );
      },
      getTokenAccountsByOwner: async (owner: string, mint: string) => {
        guardRpc();
        const t = w.tokens.get(mint);
        const amt =
          t && owner === t.deployer
            ? BigInt(t.spec.deployerHoldingTokens ?? 0) * 10n ** BigInt(t.spec.decimals)
            : 0n;
        return obs(amt > 0n ? [{ address: addr(`devacct:${owner}`), amount: amt }] : [], w.clock.now());
      },
      // Wallet funding traces: signatures and jsonParsed transactions rendered from the same histories.
      getSignatures: async (address: string, o: { before?: string; limit?: number } = {}) => {
        guardRpc();
        const txs = w.history(address); // newest first
        for (const t of txs) seen.set(t.signature, t);
        const start = o.before ? txs.findIndex((t) => t.signature === o.before) + 1 : 0;
        return obs(
          txs.slice(start, start + (o.limit ?? 1000)).map((t) => ({
            signature: t.signature,
            slot: t.slot,
            blockTime: Math.floor(t.timestamp / 1000),
            err: t.failed ? { failed: true } : null,
          })),
          w.clock.now(),
          'getSignaturesForAddress',
        );
      },
      getTransaction: async (sig: string) => {
        guardRpc();
        const t = seen.get(sig);
        if (!t) return obs(null, w.clock.now(), 'getTransaction');
        return obs(
          {
            slot: t.slot,
            blockTime: Math.floor(t.timestamp / 1000),
            meta: { err: null, innerInstructions: [] },
            transaction: {
              message: {
                accountKeys: [{ pubkey: t.feePayer, signer: true }],
                instructions: t.nativeTransfers.map((n) => ({
                  program: 'system',
                  parsed: {
                    type: 'transfer',
                    info: { source: n.from, destination: n.to, lamports: Number(n.lamports) },
                  },
                })),
              },
            },
          },
          w.clock.now(),
          'getTransaction',
        );
      },
      getRecentPrioritizationFees: async () => obs([0, 1000, 5000], w.clock.now()),
      circuit: 'CLOSED',
    };
    const helius = {
      id: 'helius',
      get configured() {
        return w.heliusConfigured;
      },
      transactions: async (address: string, o: HistoryQuery = {}) => {
        w.heliusCalls++;
        if (w.heliusBudgetSpent)
          throw new ProviderError('helius', 'BUDGET_EXCEEDED', 'daily Helius credit budget spent');
        let txs = w.history(address); // newest first
        if (o.gteTime !== undefined) txs = txs.filter((t) => t.timestamp >= o.gteTime!);
        if (o.lteTime !== undefined) txs = txs.filter((t) => t.timestamp <= o.lteTime!);
        if (o.sortOrder === 'asc') txs = [...txs].reverse();
        const start = o.cursor ? Number(o.cursor) : 0;
        const end = start + (o.limit ?? 100);
        return obs(
          {
            txs: txs.slice(start, end),
            // Like Helius: a cursor keeps coming after the last transaction; only an empty page ends it.
            next: String(end),
            unparsed: w.unparsedFor.has(address) ? 1 : 0,
          },
          w.clock.now(),
          '/v1/parsed-events/transaction-history',
        );
      },
      holderCount: async (mint: string) =>
        obs(
          { holders: w.tokens.get(mint)?.spec.holderCount ?? 1000, complete: true },
          w.clock.now(),
          'das/getTokenAccounts',
        ),
    };
    return {
      dex: dex as unknown as Providers['dex'],
      gecko: { newPools: async () => obs([], w.clock.now()) } as unknown as Providers['gecko'],
      rpc: rpc as unknown as Providers['rpc'],
      jupiter: this.jup as unknown as Providers['jupiter'],
      rugcheck: {
        summary: async () => obs({ score_normalised: 1, risks: [], lpLockedPct: 100 }, w.clock.now()),
      } as unknown as Providers['rugcheck'],
      helius: helius as unknown as Providers['helius'],
    };
  }
}

function decode(a: string): Uint8Array {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let n = 0n;
  for (const c of a) n = n * 58n + BigInt(ALPHABET.indexOf(c));
  const out = new Uint8Array(32);
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return out;
}

export const GOOD_TOKEN: TokenSpec = {
  seed: 'good',
  priceUsd: 0.001,
  supplyTokens: 1_000_000_000,
  decimals: 6,
  poolTokens: 100_000_000,
  ageMinutes: 180,
  change: { m5: 1.5, h1: 20, h6: 35, h24: 60 },
  volume: { m5: 10_000, h1: 120_000, h6: 400_000, h24: 900_000 },
  holderCount: 2000,
};

export async function makeHarness<D extends SqlDb = NodeSqliteDb>(
  o: { mode?: RuntimeMode; config?: StrategyConfig; dbPath?: string; db?: D } = {},
): Promise<{ world: World; ctx: Ctx; db: D; store: MemoryEvidenceStore }> {
  const world = new World();
  let db: D;
  if (o.db) db = o.db;
  else {
    const local = new NodeSqliteDb(o.dbPath ?? ':memory:');
    await migrateNodeDb(local, MIGRATIONS);
    db = local as unknown as D;
  }
  const config = o.config ?? DEFAULT_STRATEGY;
  await bootstrap(db, {
    config,
    env: {},
    ownerEmail: 'owner@example.com',
    now: world.clock.now(),
    actor: 'TEST',
    initialMode: o.mode ?? 'PAPER_AUTONOMOUS',
  });
  const providers = world.providers();
  const store = new MemoryEvidenceStore();
  const ctx: Ctx = {
    db,
    providers,
    solPrice: new SolPrice(providers.jupiter),
    evidenceStore: store,
    clock: world.clock,
    log: silentLogger,
    sleep: async (ms) => world.clock.advance(ms),
    config: () => loadConfig(db),
    instanceId: 'test',
  };
  return { world, ctx, db, store };
}
