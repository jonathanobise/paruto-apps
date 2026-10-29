import { z } from 'zod';
import { HttpClient, ProviderError, type HttpClientOptions, type Observed } from './http.ts';

export interface AccountInfo {
  address: string;
  owner: string;
  lamports: number;
  executable: boolean;
  /** base64 data, when requested with encoding base64 */
  data: Uint8Array | null;
  /** jsonParsed payload, when the RPC could parse the account */
  parsed: { program: string; type?: string; info?: Record<string, unknown> } | null;
}

export interface TokenAmount {
  amount: bigint;
  decimals: number;
}

export interface SignatureInfo {
  signature: string;
  slot: number;
  blockTime: number | null;
  err: unknown;
}

const Ctx = z.object({ context: z.object({ slot: z.number() }), value: z.unknown() });

const RawAccount = z
  .object({
    owner: z.string(),
    lamports: z.number(),
    executable: z.boolean(),
    data: z.union([
      z.tuple([z.string(), z.string()]),
      z.object({ program: z.string(), parsed: z.unknown() }).passthrough(),
    ]),
  })
  .passthrough();

function toAccount(address: string, raw: unknown): AccountInfo | null {
  if (raw === null || raw === undefined) return null;
  const a = RawAccount.parse(raw);
  let data: Uint8Array | null = null;
  let parsed: AccountInfo['parsed'] = null;
  if (Array.isArray(a.data)) {
    data = Uint8Array.from(atob(a.data[0]), (c) => c.charCodeAt(0));
  } else {
    const p = a.data.parsed as { type?: string; info?: Record<string, unknown> } | string;
    parsed =
      typeof p === 'object' && p
        ? { program: a.data.program, type: p.type, info: p.info }
        : { program: a.data.program };
  }
  return { address, owner: a.owner, lamports: a.lamports, executable: a.executable, data, parsed };
}

/**
 * Solana JSON-RPC reader. Read-only by construction: there is no method here (or anywhere in the
 * codebase) that submits a transaction.
 */
export class SolanaRpc {
  private readonly http: HttpClient;
  private id = 0;
  constructor(
    readonly url: string = 'https://api.mainnet-beta.solana.com',
    opts: Omit<HttpClientOptions, 'provider'> = {},
  ) {
    this.http = new HttpClient({
      provider: 'solana-rpc',
      // The public endpoint throttles hard (notably getTokenLargestAccounts); a private RPC can lower these.
      policy: url.includes('api.mainnet-beta.solana.com')
        ? { minIntervalMs: 400, maxRetries: 5, baseBackoffMs: 1_500, maxBackoffMs: 15_000 }
        : url.includes('helius-rpc.com')
          ? { minIntervalMs: 110, maxRetries: 4, baseBackoffMs: 1_000 } // Helius Free: 10 req/s
          : { minIntervalMs: 60 },
      ...opts,
    });
  }

  private async call<T>(
    method: string,
    params: unknown[],
    parse: (result: unknown) => T,
  ): Promise<Observed<T>> {
    const body = JSON.stringify({ jsonrpc: '2.0', id: ++this.id, method, params });
    const observed = await this.http.request(
      method,
      this.url,
      { method: 'POST', headers: { 'content-type': 'application/json' }, body },
      (j) => {
        const r = j as { result?: unknown; error?: { code: number; message: string } };
        if (r.error) throw new Error(`RPC error ${r.error.code}: ${r.error.message}`);
        return r.result;
      },
    );
    const result = observed.data;
    const ctx = Ctx.safeParse(result);
    if (ctx.success) observed.provenance.slot = ctx.data.context.slot;
    try {
      return { data: parse(result), provenance: observed.provenance };
    } catch (e) {
      throw new ProviderError('solana-rpc', 'INVALID_RESPONSE', `${method}: ${(e as Error).message}`);
    }
  }

  getSlot(): Promise<Observed<number>> {
    return this.call('getSlot', [{ commitment: 'confirmed' }], (r) => z.number().parse(r));
  }

  getAccount(
    address: string,
    encoding: 'base64' | 'jsonParsed' = 'base64',
  ): Promise<Observed<AccountInfo | null>> {
    return this.call('getAccountInfo', [address, { encoding, commitment: 'confirmed' }], (r) =>
      toAccount(address, Ctx.parse(r).value),
    );
  }

  /** Up to 100 accounts. `ownerOnly` skips account data (dataSlice length 0) when only the owner program matters. */
  async getAccounts(
    addresses: string[],
    encoding: 'base64' | 'jsonParsed' = 'base64',
    ownerOnly = false,
  ): Promise<Observed<Array<AccountInfo | null>>> {
    if (addresses.length > 100) throw new Error('getMultipleAccounts takes at most 100 addresses');
    const opts: Record<string, unknown> = { encoding, commitment: 'confirmed' };
    if (ownerOnly && encoding === 'base64') opts.dataSlice = { offset: 0, length: 0 };
    return this.call('getMultipleAccounts', [addresses, opts], (r) =>
      z
        .array(z.unknown())
        .parse(Ctx.parse(r).value)
        .map((v, i) => toAccount(addresses[i]!, v)),
    );
  }

  getTokenSupply(mint: string): Promise<Observed<TokenAmount>> {
    return this.call('getTokenSupply', [mint, { commitment: 'confirmed' }], (r) => {
      const v = z.object({ amount: z.string(), decimals: z.number() }).parse(Ctx.parse(r).value);
      return { amount: BigInt(v.amount), decimals: v.decimals };
    });
  }

  /** Top 20 token accounts by balance. */
  getTokenLargestAccounts(mint: string): Promise<Observed<Array<{ address: string; amount: bigint }>>> {
    return this.call('getTokenLargestAccounts', [mint, { commitment: 'confirmed' }], (r) =>
      z
        .array(z.object({ address: z.string(), amount: z.string() }))
        .parse(Ctx.parse(r).value)
        .map((a) => ({ address: a.address, amount: BigInt(a.amount) })),
    );
  }

  getTokenAccountsByOwner(
    owner: string,
    mint: string,
  ): Promise<Observed<Array<{ address: string; amount: bigint }>>> {
    return this.call(
      'getTokenAccountsByOwner',
      [owner, { mint }, { encoding: 'jsonParsed', commitment: 'confirmed' }],
      (r) =>
        z
          .array(
            z.object({
              pubkey: z.string(),
              account: z
                .object({
                  data: z
                    .object({
                      parsed: z
                        .object({
                          info: z.object({ tokenAmount: z.object({ amount: z.string() }) }).passthrough(),
                        })
                        .passthrough(),
                    })
                    .passthrough(),
                })
                .passthrough(),
            }),
          )
          .parse(Ctx.parse(r).value)
          .map((a) => ({ address: a.pubkey, amount: BigInt(a.account.data.parsed.info.tokenAmount.amount) })),
    );
  }

  getSignatures(
    address: string,
    opts: { before?: string; until?: string; limit?: number } = {},
  ): Promise<Observed<SignatureInfo[]>> {
    return this.call(
      'getSignaturesForAddress',
      [
        address,
        { commitment: 'confirmed', limit: opts.limit ?? 1000, before: opts.before, until: opts.until },
      ],
      (r) =>
        z
          .array(
            z
              .object({
                signature: z.string(),
                slot: z.number(),
                blockTime: z.number().nullable().optional(),
                err: z.unknown(),
              })
              .passthrough(),
          )
          .parse(r)
          .map((s) => ({
            signature: s.signature,
            slot: s.slot,
            blockTime: s.blockTime ?? null,
            err: s.err ?? null,
          })),
    );
  }

  /** jsonParsed; asks for transaction versions up to 1, or the RPC refuses newer (version 1) transactions. */
  getTransaction(signature: string): Promise<Observed<Record<string, unknown> | null>> {
    return this.call(
      'getTransaction',
      [signature, { encoding: 'jsonParsed', commitment: 'confirmed', maxSupportedTransactionVersion: 1 }],
      (r) => (r === null ? null : z.record(z.string(), z.unknown()).parse(r)),
    );
  }

  /** micro-lamports per compute unit observed in recent slots for transactions touching `accounts`. */
  getRecentPrioritizationFees(accounts: string[]): Promise<Observed<number[]>> {
    return this.call('getRecentPrioritizationFees', [accounts], (r) =>
      z
        .array(z.object({ prioritizationFee: z.number(), slot: z.number() }))
        .parse(r)
        .map((f) => f.prioritizationFee),
    );
  }

  get circuit() {
    return this.http.circuit;
  }
}
