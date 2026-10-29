import { describe, expect, it } from 'vitest';
import { Helius, rpcUrl } from '../src/index.ts';

const fakeFetch = (calls: string[], body: unknown, status = 200) =>
  (async (url: string | URL | Request) => {
    calls.push(String(url));
    return new Response(JSON.stringify(body), { status });
  }) as typeof fetch;

describe('Helius adapter', () => {
  it('sends oldest-first, signature-cursor and time-window parameters', async () => {
    const calls: string[] = [];
    const h = new Helius('k', { fetchImpl: fakeFetch(calls, []), sleep: async () => undefined });
    await h.transactions('Addr', {
      sortOrder: 'asc',
      afterSignature: 'sigA',
      gteTime: 1_700_000_000_500,
      lteTime: 1_700_000_120_000,
      type: 'SWAP',
      limit: 50,
    });
    const u = new URL(calls[0]!);
    expect(u.pathname).toBe('/v0/addresses/Addr/transactions');
    expect(Object.fromEntries(u.searchParams)).toMatchObject({
      'sort-order': 'asc',
      'after-signature': 'sigA',
      'gte-time': '1700000000',
      'lte-time': '1700000120',
      type: 'SWAP',
      limit: '50',
    });
    await h.transactions('Addr', { beforeSignature: 'sigB', sortOrder: 'desc' });
    expect(new URL(calls[1]!).searchParams.get('before-signature')).toBe('sigB');
  });
  it('treats an empty type-filtered window as no transactions, and never records the key', async () => {
    const calls: string[] = [];
    const h = new Helius('secret-key', {
      fetchImpl: fakeFetch(
        calls,
        {
          error:
            'Failed to find events within the search period. To continue search, query the API again with the `before-signature` parameter set to x.',
        },
        404,
      ),
      sleep: async () => undefined,
      policy: { maxRetries: 0 },
    });
    const r = await h.transactions('Addr', { type: 'SWAP', sortOrder: 'asc' });
    expect(r.data).toEqual([]);
    expect(r.provenance.endpoint).not.toMatch(/secret-key/);
  });
  it('derives a private Helius RPC from the key unless an RPC is configured', () => {
    expect(rpcUrl({ HELIUS_API_KEY: 'k' })).toBe('https://mainnet.helius-rpc.com/?api-key=k');
    expect(rpcUrl({ HELIUS_API_KEY: 'k', SOLANA_RPC_URL: 'https://x' })).toBe('https://x');
    expect(rpcUrl({})).toBe('https://api.mainnet-beta.solana.com');
  });
  it('books credits before each billed call and makes no request once the daily budget is spent', async () => {
    const calls: string[] = [];
    const booked: number[] = [];
    let left = 120;
    const h = new Helius('k', {
      fetchImpl: fakeFetch(calls, []),
      sleep: async () => undefined,
      credits: {
        reserve: async (_p, credits) => {
          if (credits > left) return false;
          left -= credits;
          booked.push(credits);
          return true;
        },
      },
    });
    await h.transactions('Addr', {});
    await expect(h.transactions('Addr', {})).rejects.toMatchObject({ kind: 'BUDGET_EXCEEDED' });
    expect(calls).toHaveLength(1);
    expect(booked).toEqual([100]);
  });
});
