// SYNTHETIC TEST FIXTURE — a simulated constant-product market for tests only. Never used in production.
import {
  ProviderError,
  USDC,
  WSOL,
  type Observed,
  type Quote,
  type QuoteProvider,
  type QuoteRequest,
} from '@alpha-desk/providers';

export interface FakePool {
  tokenReserve: bigint; // base units
  usdReserve: bigint; // micro-USD
  decimals: number;
}

export type QuoteMode = 'ok' | 'outage' | 'noroute';

const prov = (endpoint: string, at: number, data: unknown): Observed<unknown>['provenance'] => ({
  provider: 'fake-jupiter',
  endpoint,
  method: 'GET',
  observedAt: at,
  ingestedAt: at,
  latencyMs: 1,
  status: 200,
  sha256: `fake${Math.random().toString(16).slice(2)}`,
  raw: JSON.stringify(data, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)),
});

/** Jupiter stand-in quoting from x·y=k pools with a 0.25% fee. */
export class FakeJupiter implements QuoteProvider {
  pools = new Map<string, FakePool>();
  mode: QuoteMode = 'ok';
  modeByMint = new Map<string, QuoteMode>();
  calls = 0;
  /** Called before each quote — lets tests move the market during the simulated latency. */
  beforeQuote: ((n: number) => void) | null = null;
  constructor(public now: () => number) {}

  setPrice(mint: string, priceUsd: number): void {
    const p = this.pools.get(mint)!;
    const tokens = Number(p.tokenReserve) / 10 ** p.decimals;
    p.usdReserve = BigInt(Math.round(tokens * priceUsd * 1e6));
  }
  price(mint: string): number {
    const p = this.pools.get(mint)!;
    return Number(p.usdReserve) / 1e6 / (Number(p.tokenReserve) / 10 ** p.decimals);
  }

  async quote(req: QuoteRequest): Promise<Observed<Quote>> {
    this.calls++;
    this.beforeQuote?.(this.calls);
    const mint = req.inputMint === USDC ? req.outputMint : req.inputMint;
    const mode = this.modeByMint.get(mint) ?? this.mode;
    if (mode === 'outage') throw new ProviderError('jupiter', 'NETWORK', 'simulated outage');
    if (req.inputMint === WSOL && req.outputMint === USDC) {
      const q: Quote = {
        inputMint: WSOL,
        outputMint: USDC,
        inAmount: req.amount,
        outAmount: 150_000_000n,
        minOutAmount: 149_000_000n,
        slippageBps: req.slippageBps,
        priceImpactPct: '0',
        routeLabels: ['Fake'],
        ammKeys: ['fake'],
        contextSlot: 1,
      };
      return { data: q, provenance: prov('/quote', this.now(), q) };
    }
    const pool = this.pools.get(mint);
    if (mode === 'noroute' || !pool)
      throw new ProviderError('jupiter', 'HTTP', 'HTTP 400 {"errorCode":"COULD_NOT_FIND_ANY_ROUTE"}', 400);
    const inEff = (req.amount * 9975n) / 10000n;
    let out: bigint;
    if (req.inputMint === USDC) out = (pool.tokenReserve * inEff) / (pool.usdReserve + inEff);
    else out = (pool.usdReserve * inEff) / (pool.tokenReserve + inEff);
    const q: Quote = {
      inputMint: req.inputMint,
      outputMint: req.outputMint,
      inAmount: req.amount,
      outAmount: out,
      minOutAmount: (out * BigInt(10_000 - req.slippageBps)) / 10_000n,
      slippageBps: req.slippageBps,
      priceImpactPct: '0',
      routeLabels: ['Fake AMM'],
      ammKeys: [mint],
      contextSlot: 1,
    };
    return { data: q, provenance: prov('/quote', this.now(), q) };
  }
}
