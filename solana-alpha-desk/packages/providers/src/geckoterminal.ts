import { z } from 'zod';
import { HttpClient, type HttpClientOptions, type Observed } from './http.ts';

const PoolList = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      attributes: z.object({ address: z.string(), pool_created_at: z.string().nullable().optional() }).passthrough(),
      relationships: z
        .object({
          base_token: z.object({ data: z.object({ id: z.string() }) }),
          dex: z.object({ data: z.object({ id: z.string() }) }).optional(),
        })
        .passthrough(),
    }),
  ),
});

export interface NewPool {
  poolAddress: string;
  baseMint: string;
  dex: string | null;
  createdAt: number | null;
}

/**
 * GeckoTerminal public API — supplementary discovery of newly created Solana pools.
 * Keyless limit is ~30 calls/min and shared per IP; 429s are expected and handled by HttpClient.
 */
export class GeckoTerminal {
  private readonly http: HttpClient;
  constructor(opts: Omit<HttpClientOptions, 'provider'> = {}) {
    this.http = new HttpClient({ provider: 'geckoterminal', policy: { minIntervalMs: 2_500, maxRetries: 1 }, ...opts });
  }

  async newPools(page = 1): Promise<Observed<NewPool[]>> {
    const url = `https://api.geckoterminal.com/api/v2/networks/solana/new_pools?page=${page}`;
    return this.http.request('/networks/solana/new_pools', url, { headers: { accept: 'application/json' } }, (j) =>
      PoolList.parse(j).data.map((p) => ({
        poolAddress: p.attributes.address,
        baseMint: p.relationships.base_token.data.id.replace(/^solana_/, ''),
        dex: p.relationships.dex?.data.id ?? null,
        createdAt: p.attributes.pool_created_at ? Date.parse(p.attributes.pool_created_at) : null,
      })),
    );
  }
}
