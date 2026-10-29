import { z } from 'zod';
import { HttpClient, ProviderError, type HttpClientOptions, type Observed } from './http.ts';

const QuoteSchema = z
  .object({
    inputMint: z.string(),
    inAmount: z.string().regex(/^\d+$/),
    outputMint: z.string(),
    outAmount: z.string().regex(/^\d+$/),
    otherAmountThreshold: z.string().regex(/^\d+$/),
    swapMode: z.string(),
    slippageBps: z.number(),
    priceImpactPct: z.string(),
    routePlan: z.array(
      z
        .object({
          swapInfo: z.object({ ammKey: z.string(), label: z.string().optional() }).passthrough(),
          percent: z.number().nullable().optional(),
        })
        .passthrough(),
    ),
    contextSlot: z.number().optional(),
  })
  .passthrough();

export interface Quote {
  inputMint: string;
  outputMint: string;
  inAmount: bigint;
  outAmount: bigint;
  /** Minimum out after slippage tolerance. */
  minOutAmount: bigint;
  slippageBps: number;
  priceImpactPct: string;
  routeLabels: string[];
  ammKeys: string[];
  contextSlot: number | null;
}

export interface QuoteRequest {
  inputMint: string;
  outputMint: string;
  amount: bigint;
  slippageBps: number;
}

export interface QuoteProvider {
  quote(req: QuoteRequest): Promise<Observed<Quote>>;
}

/**
 * Jupiter Swap API v1 quotes (https://dev.jup.ag/docs/swap-api). Quotes only: this adapter never builds,
 * signs or sends a swap transaction. `lite-api.jup.ag` is keyless; set JUPITER_API_KEY to use api.jup.ag.
 */
export class Jupiter implements QuoteProvider {
  private readonly http: HttpClient;
  private readonly base: string;
  constructor(opts: Omit<HttpClientOptions, 'provider'> & { apiKey?: string; baseUrl?: string } = {}) {
    this.base =
      opts.baseUrl ?? (opts.apiKey ? 'https://api.jup.ag/swap/v1' : 'https://lite-api.jup.ag/swap/v1');
    this.headers = opts.apiKey ? { 'x-api-key': opts.apiKey } : {};
    this.http = new HttpClient({
      provider: 'jupiter',
      policy: { minIntervalMs: opts.apiKey ? 120 : 1_100 },
      ...opts,
    });
  }
  private readonly headers: Record<string, string>;

  async quote(req: QuoteRequest): Promise<Observed<Quote>> {
    if (req.amount <= 0n) throw new ProviderError('jupiter', 'INVALID_RESPONSE', 'amount must be positive');
    const qs = new URLSearchParams({
      inputMint: req.inputMint,
      outputMint: req.outputMint,
      amount: req.amount.toString(),
      slippageBps: String(req.slippageBps),
      swapMode: 'ExactIn',
      restrictIntermediateTokens: 'true',
    });
    const observed = await this.http.request(
      '/quote',
      `${this.base}/quote?${qs}`,
      { headers: this.headers },
      (j) => {
        const q = QuoteSchema.parse(j);
        return {
          inputMint: q.inputMint,
          outputMint: q.outputMint,
          inAmount: BigInt(q.inAmount),
          outAmount: BigInt(q.outAmount),
          minOutAmount: BigInt(q.otherAmountThreshold),
          slippageBps: q.slippageBps,
          priceImpactPct: q.priceImpactPct,
          routeLabels: q.routePlan.map((r) => r.swapInfo.label ?? 'unknown'),
          ammKeys: q.routePlan.map((r) => r.swapInfo.ammKey),
          contextSlot: q.contextSlot ?? null,
        } satisfies Quote;
      },
    );
    if (observed.data.contextSlot !== null) observed.provenance.slot = observed.data.contextSlot;
    return observed;
  }

  get circuit() {
    return this.http.circuit;
  }
}
