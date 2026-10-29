import { z } from 'zod';
import { HttpClient, type HttpClientOptions, type Observed } from './http.ts';

const num = z
  .union([z.number(), z.string()])
  .transform((v) => Number(v))
  .pipe(z.number().finite());
const Window = z
  .object({ m5: num.optional(), h1: num.optional(), h6: num.optional(), h24: num.optional() })
  .partial();
const Txns = z.object({ buys: z.number().int().nonnegative(), sells: z.number().int().nonnegative() });

export const DexPairSchema = z
  .object({
    chainId: z.string(),
    dexId: z.string(),
    url: z.string().optional(),
    pairAddress: z.string(),
    labels: z.array(z.string()).optional(),
    baseToken: z.object({ address: z.string(), name: z.string().optional(), symbol: z.string().optional() }),
    quoteToken: z.object({ address: z.string(), name: z.string().optional(), symbol: z.string().optional() }),
    priceNative: z.string().optional(),
    priceUsd: z.string().optional(),
    txns: z
      .object({ m5: Txns.optional(), h1: Txns.optional(), h6: Txns.optional(), h24: Txns.optional() })
      .optional(),
    volume: Window.optional(),
    priceChange: Window.optional(),
    liquidity: z.object({ usd: num.optional(), base: num.optional(), quote: num.optional() }).optional(),
    fdv: num.optional(),
    marketCap: num.optional(),
    pairCreatedAt: z.number().int().optional(),
  })
  .passthrough();
export type DexPair = z.infer<typeof DexPairSchema>;

const ProfileList = z.array(z.object({ chainId: z.string(), tokenAddress: z.string() }).passthrough());

const BASE = 'https://api.dexscreener.com';

/**
 * DexScreener public API (https://docs.dexscreener.com/api/reference).
 * Published limits: 60 req/min for profile/boost feeds, 300 req/min for pair endpoints.
 */
export class DexScreener {
  private readonly http: HttpClient;
  constructor(opts: Omit<HttpClientOptions, 'provider'> = {}) {
    this.http = new HttpClient({ provider: 'dexscreener', policy: { minIntervalMs: 250 }, ...opts });
  }

  private feed(path: string): Promise<Observed<Array<{ chainId: string; tokenAddress: string }>>> {
    return this.http.request(path, BASE + path, {}, (j) => {
      // boosts/top and takeovers return arrays; tolerate a single object too
      const arr = Array.isArray(j) ? j : [j];
      return ProfileList.parse(arr);
    });
  }

  latestProfiles() {
    return this.feed('/token-profiles/latest/v1');
  }
  latestBoosts() {
    return this.feed('/token-boosts/latest/v1');
  }
  topBoosts() {
    return this.feed('/token-boosts/top/v1');
  }
  latestTakeovers() {
    return this.feed('/community-takeovers/latest/v1');
  }

  /** All pairs for up to 30 token mints on Solana. */
  async tokens(mints: string[]): Promise<Observed<DexPair[]>> {
    if (mints.length === 0 || mints.length > 30) throw new Error('tokens() takes 1–30 mints');
    const path = `/tokens/v1/solana/${mints.join(',')}`;
    return this.http.request('/tokens/v1/solana', BASE + path, {}, (j) =>
      z.array(DexPairSchema).parse(j ?? []),
    );
  }

  /** Every pool DexScreener knows for one token (used for earliest-pool and total liquidity). */
  async tokenPairs(mint: string): Promise<Observed<DexPair[]>> {
    return this.http.request('/token-pairs/v1/solana', `${BASE}/token-pairs/v1/solana/${mint}`, {}, (j) =>
      z.array(DexPairSchema).parse(j ?? []),
    );
  }

  async pair(pairAddress: string): Promise<Observed<DexPair | null>> {
    return this.http.request(
      '/latest/dex/pairs/solana',
      `${BASE}/latest/dex/pairs/solana/${pairAddress}`,
      {},
      (j) => {
        const parsed = z
          .object({ pairs: z.array(DexPairSchema).nullable().optional() })
          .passthrough()
          .parse(j);
        return parsed.pairs?.[0] ?? null;
      },
    );
  }

  get circuit() {
    return this.http.circuit;
  }
}
