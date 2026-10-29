import { z } from 'zod';
import { HttpClient, ProviderError, type HttpClientOptions, type Observed } from './http.ts';
import type { ParsedTx, TransactionIndexer } from './indexer.ts';

const EnhancedTx = z
  .object({
    signature: z.string(),
    slot: z.number(),
    timestamp: z.number(),
    type: z.string(),
    source: z.string().optional(),
    feePayer: z.string(),
    nativeTransfers: z
      .array(
        z
          .object({
            fromUserAccount: z.string().nullable(),
            toUserAccount: z.string().nullable(),
            amount: z.number(),
          })
          .passthrough(),
      )
      .optional(),
    tokenTransfers: z
      .array(
        z
          .object({
            fromUserAccount: z.string().nullable(),
            toUserAccount: z.string().nullable(),
            mint: z.string(),
            tokenAmount: z.number(),
          })
          .passthrough(),
      )
      .optional(),
    transactionError: z.unknown().optional(),
  })
  .passthrough();

/**
 * Helius adapter — holder/trade intelligence and historical transaction indexer.
 * Status: BLOCKED_BY_CREDENTIALS until HELIUS_API_KEY is configured. Endpoints follow
 * https://www.helius.dev/docs (Enhanced Transactions API, DAS getTokenAccounts).
 */
export class Helius implements TransactionIndexer {
  readonly id = 'helius';
  private readonly http: HttpClient;
  constructor(
    private readonly apiKey: string | undefined,
    opts: Omit<HttpClientOptions, 'provider'> = {},
  ) {
    this.http = new HttpClient({ provider: 'helius', policy: { minIntervalMs: 120 }, ...opts });
  }

  get configured(): boolean {
    return Boolean(this.apiKey);
  }

  private requireKey(): string {
    if (!this.apiKey)
      throw new ProviderError('helius', 'BLOCKED_BY_CREDENTIALS', 'HELIUS_API_KEY is not configured');
    return this.apiKey;
  }

  async transactions(
    address: string,
    opts: { before?: string; limit?: number; type?: string } = {},
  ): Promise<Observed<ParsedTx[]>> {
    const key = this.requireKey();
    const qs = new URLSearchParams({ 'api-key': key, limit: String(opts.limit ?? 100) });
    if (opts.before) qs.set('before', opts.before);
    if (opts.type) qs.set('type', opts.type);
    const url = `https://api.helius.xyz/v0/addresses/${address}/transactions?${qs}`;
    const res = await this.http.request('/v0/addresses/transactions', url, {}, (j) =>
      z
        .array(EnhancedTx)
        .parse(j)
        .map((t): ParsedTx => ({
          signature: t.signature,
          slot: t.slot,
          timestamp: t.timestamp * 1000,
          type: t.type,
          source: t.source ?? null,
          feePayer: t.feePayer,
          failed: t.transactionError !== null && t.transactionError !== undefined,
          nativeTransfers: (t.nativeTransfers ?? []).map((n) => ({
            from: n.fromUserAccount,
            to: n.toUserAccount,
            lamports: BigInt(Math.round(n.amount)),
          })),
          tokenTransfers: (t.tokenTransfers ?? []).map((n) => ({
            from: n.fromUserAccount,
            to: n.toUserAccount,
            mint: n.mint,
            uiAmount: String(n.tokenAmount),
          })),
        })),
    );
    // The API key must never reach stored evidence.
    res.provenance.endpoint = '/v0/addresses/transactions';
    return res;
  }

  /** Counts holders with a non-zero balance (DAS getTokenAccounts, paginated). */
  async holderCount(mint: string, maxPages = 20): Promise<Observed<{ holders: number; complete: boolean }>> {
    const key = this.requireKey();
    const owners = new Set<string>();
    let cursor: string | undefined;
    let last: Observed<unknown> | null = null;
    for (let page = 0; page < maxPages; page++) {
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
