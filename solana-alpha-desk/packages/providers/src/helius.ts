import { z } from 'zod';
import { HttpClient, ProviderError, type HttpClientOptions, type Observed } from './http.ts';
import type { HistoryPage, HistoryQuery, ParsedTx, TransactionIndexer } from './indexer.ts';

const Num = z.union([z.number(), z.string()]);

/** One item of a Parsed Events transaction-history page (helius.dev/docs/parsed-events/parsed-response). */
const ParsedEvent = z
  .object({
    signature: z.string(),
    parserStatus: z.string(),
    parsed: z
      .object({
        slot: z.number(),
        blockTime: z.number().nullable().optional(),
        feePayer: z.string().nullable().optional(),
        transactionStatus: z.string().optional(),
        error: z.unknown().optional(),
        nativeTransfers: z
          .array(
            z
              .object({
                fromUserAccount: z.string().nullable().optional(),
                toUserAccount: z.string().nullable().optional(),
                amount: Num,
              })
              .passthrough(),
          )
          .nullable()
          .optional(),
        tokenTransfers: z
          .array(
            z
              .object({
                fromUserAccount: z.string().nullable().optional(),
                toUserAccount: z.string().nullable().optional(),
                mint: z.string(),
                rawTokenAmount: Num,
                decimals: z.number(),
              })
              .passthrough(),
          )
          .nullable()
          .optional(),
        summary: z
          .object({
            type: z.string().nullable().optional(),
            parsedData: z
              .object({ protocol: z.string().nullable().optional() })
              .passthrough()
              .nullable()
              .optional(),
          })
          .passthrough()
          .nullable()
          .optional(),
        instructions: z
          .array(
            z
              .object({
                programName: z.string().nullable().optional(),
                instructionName: z.string().nullable().optional(),
              })
              .passthrough(),
          )
          .nullable()
          .optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const HistoryResponse = z
  .object({ data: z.array(ParsedEvent), paginationToken: z.string().nullable().optional() })
  .passthrough();

/** Token creation has no summary type; it shows as a mint initialisation or a launchpad's create instruction. */
const CREATES_TOKEN = /^(initialize_?mint2?|create(_?v\d)?|create_?token)$/i;

const SUMMARY_TYPES: Record<string, string> = {
  swap: 'SWAP',
  transfer: 'TRANSFER',
  add_liquidity: 'ADD_LIQUIDITY',
  remove_liquidity: 'WITHDRAW_LIQUIDITY',
  create_account: 'CREATE_ACCOUNT',
  create_token_account: 'CREATE_TOKEN_ACCOUNT',
};

/** Raw integer amount and decimals as a decimal string, without floating-point scaling. */
export function uiAmount(raw: number | string, decimals: number): string {
  const digits = BigInt(typeof raw === 'number' ? Math.round(raw) : raw).toString();
  const neg = digits.startsWith('-');
  const d = (neg ? digits.slice(1) : digits).padStart(decimals + 1, '0');
  const whole = d.slice(0, d.length - decimals);
  const frac = decimals ? d.slice(d.length - decimals).replace(/0+$/, '') : '';
  return `${neg ? '-' : ''}${whole}${frac ? `.${frac}` : ''}`;
}

/** Maps a Parsed Events item to the provider-neutral transaction, or null when Helius could not parse it. */
export function fromParsedEvent(item: z.infer<typeof ParsedEvent>): ParsedTx | null {
  const p = item.parsed;
  if (item.parserStatus !== 'OK' || !p) return null;
  const summaryType = p.summary?.type ?? null;
  const creates = (p.instructions ?? []).some((i) => CREATES_TOKEN.test(i.instructionName ?? ''));
  return {
    signature: item.signature,
    slot: p.slot,
    timestamp: (p.blockTime ?? 0) * 1000,
    type: creates
      ? 'CREATE'
      : summaryType
        ? (SUMMARY_TYPES[summaryType] ?? summaryType.toUpperCase())
        : 'UNKNOWN',
    source: p.summary?.parsedData?.protocol ?? null,
    feePayer: p.feePayer ?? '',
    failed: p.transactionStatus === 'ERROR' || (p.error !== null && p.error !== undefined),
    nativeTransfers: (p.nativeTransfers ?? []).map((n) => ({
      from: n.fromUserAccount ?? null,
      to: n.toUserAccount ?? null,
      lamports: BigInt(typeof n.amount === 'number' ? Math.round(n.amount) : n.amount),
    })),
    tokenTransfers: (p.tokenTransfers ?? []).map((t) => ({
      from: t.fromUserAccount ?? null,
      to: t.toUserAccount ?? null,
      mint: t.mint,
      uiAmount: uiAmount(t.rawTokenAmount, t.decimals),
    })),
  };
}

/** A daily credit budget: `reserve` books the credits for one call, or refuses when the cap is spent. */
export interface CreditBudget {
  reserve(provider: string, credits: number): Promise<boolean>;
}

/** Helius credits per call (helius.dev/docs/billing/credits). */
export const HELIUS_CREDITS = { parsedEvents: 10, das: 10 } as const;

/**
 * Helius adapter — holder/trade intelligence and historical transaction indexer.
 * Status: BLOCKED_BY_CREDENTIALS until HELIUS_API_KEY is configured. Endpoints follow
 * https://www.helius.dev/docs (Parsed Events transaction history, DAS getTokenAccounts).
 */
export class Helius implements TransactionIndexer {
  readonly id = 'helius';
  private readonly http: HttpClient;
  private readonly credits: CreditBudget | undefined;
  constructor(
    private readonly apiKey: string | undefined,
    opts: Omit<HttpClientOptions, 'provider'> & { credits?: CreditBudget } = {},
  ) {
    this.credits = opts.credits;
    // Free plan: DAS and Enhanced APIs are limited to 2 requests/s; Parsed Events has no published limit and
    // is paced the same. Helius asks for ~1 s initial retry backoff.
    this.http = new HttpClient({
      provider: 'helius',
      policy: { minIntervalMs: 550, maxRetries: 4, baseBackoffMs: 1_000, maxBackoffMs: 16_000 },
      ...opts,
    });
  }

  get configured(): boolean {
    return Boolean(this.apiKey);
  }

  /** Books the credits for one call against the daily budget; refuses the call once the budget is spent. */
  private async charge(credits: number): Promise<void> {
    if (this.credits && !(await this.credits.reserve('helius', credits)))
      throw new ProviderError('helius', 'BUDGET_EXCEEDED', 'daily Helius credit budget spent');
  }

  private requireKey(): string {
    if (!this.apiKey)
      throw new ProviderError('helius', 'BLOCKED_BY_CREDENTIALS', 'HELIUS_API_KEY is not configured');
    return this.apiKey;
  }

  /**
   * Transaction history of an address from Parsed Events (POST /v1/parsed-events/transaction-history, 10
   * credits a page): oldest- or newest-first, with a block-time window (Unix seconds on the wire) and a
   * page cursor. Items Helius could not parse are counted in `unparsed`, never silently dropped.
   */
  async transactions(address: string, opts: HistoryQuery = {}): Promise<Observed<HistoryPage>> {
    const key = this.requireKey();
    const time: Record<string, number> = {};
    if (opts.gteTime !== undefined) time.gte = Math.floor(opts.gteTime / 1000);
    if (opts.lteTime !== undefined) time.lte = Math.ceil(opts.lteTime / 1000);
    const body: Record<string, unknown> = {
      address,
      limit: opts.limit ?? 100,
      sortOrder: opts.sortOrder ?? 'desc',
      commitment: 'confirmed',
    };
    if (opts.cursor) body.paginationToken = opts.cursor;
    if (Object.keys(time).length) body.time = time;
    await this.charge(HELIUS_CREDITS.parsedEvents);
    const res = await this.http.request(
      '/v1/parsed-events/transaction-history',
      `https://mainnet.helius-rpc.com/v1/parsed-events/transaction-history?api-key=${encodeURIComponent(key)}`,
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) },
      (j) => {
        const page = HistoryResponse.parse(j);
        const txs = page.data.map(fromParsedEvent);
        return {
          txs: txs.filter((t): t is ParsedTx => t !== null),
          next: page.paginationToken || null,
          unparsed: txs.filter((t) => t === null).length,
        };
      },
    );
    // The API key must never reach stored evidence.
    res.provenance.endpoint = '/v1/parsed-events/transaction-history';
    return res;
  }

  /** Counts holders with a non-zero balance (DAS getTokenAccounts, paginated). */
  async holderCount(mint: string, maxPages = 20): Promise<Observed<{ holders: number; complete: boolean }>> {
    const key = this.requireKey();
    const owners = new Set<string>();
    let cursor: string | undefined;
    let last: Observed<unknown> | null = null;
    for (let page = 0; page < maxPages; page++) {
      await this.charge(HELIUS_CREDITS.das);
      last = await this.http.request(
        'das/getTokenAccounts',
        `https://mainnet.helius-rpc.com/?api-key=${key}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getTokenAccounts',
            params: { mint, limit: 1000, cursor },
          }),
        },
      );
      const r = (
        last.data as {
          result?: { token_accounts?: Array<{ owner: string; amount: number }>; cursor?: string };
        }
      ).result;
      for (const a of r?.token_accounts ?? []) if (a.amount > 0) owners.add(a.owner);
      cursor = r?.cursor;
      if (!cursor) {
        return {
          data: { holders: owners.size, complete: true },
          provenance: { ...last.provenance, endpoint: 'das/getTokenAccounts' },
        };
      }
    }
    return {
      data: { holders: owners.size, complete: false },
      provenance: { ...last!.provenance, endpoint: 'das/getTokenAccounts' },
    };
  }
}
