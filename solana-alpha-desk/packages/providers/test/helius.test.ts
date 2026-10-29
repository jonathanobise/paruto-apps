import { describe, expect, it } from 'vitest';
import { fromParsedEvent, Helius, rpcUrl, uiAmount } from '../src/index.ts';

const fakeFetch = (calls: Array<{ url: string; body: unknown }>, body: unknown, status = 200) =>
  (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), body: init?.body ? JSON.parse(String(init.body)) : null });
    return new Response(JSON.stringify(body), { status });
  }) as typeof fetch;

/** Shaped as in helius.dev/docs/parsed-events/parsed-response. */
const item = (o: { signature: string; parsed?: Record<string, unknown>; parserStatus?: string }) => ({
  signature: o.signature,
  parserStatus: o.parserStatus ?? 'OK',
  ...(o.parserStatus === 'ERROR'
    ? { parserError: { code: 'X', message: 'unsupported' } }
    : {
        parsed: {
          slot: 433950192,
          blockTime: 1784487060,
          fee: 2005000,
          feePayer: 'GV6U',
          transactionStatus: 'OK',
          error: null,
          decodedError: null,
          nativeTransfers: [{ fromUserAccount: 'GV6U', toUserAccount: 'teBP', amount: 2039280 }],
          tokenTransfers: [
            {
              fromUserAccount: 'Pool',
              toUserAccount: 'GV6U',
              fromTokenAccount: 'a',
              toTokenAccount: 'b',
              rawTokenAmount: 64672839261950,
              decimals: 6,
              tokenStandard: 'Fungible',
              mint: 'pump',
            },
          ],
          summary: { type: 'swap', description: 'swapped', parsedData: { protocol: 'jupiter' } },
          instructions: [{ programName: 'jupiter', instructionName: 'route' }],
          ...o.parsed,
        },
      }),
});

describe('Helius Parsed Events adapter', () => {
  it('posts the documented body: oldest-first, time window in seconds, page cursor, key in the query', async () => {
    const calls: Array<{ url: string; body: unknown }> = [];
    const h = new Helius('k', {
      fetchImpl: fakeFetch(calls, { data: [], paginationToken: null }),
      sleep: async () => undefined,
    });
    await h.transactions('Addr', {
      sortOrder: 'asc',
      cursor: '433950192:0',
      gteTime: 1_700_000_000_500,
      lteTime: 1_700_000_120_000,
      limit: 50,
    });
    const u = new URL(calls[0]!.url);
    expect(`${u.origin}${u.pathname}`).toBe(
      'https://mainnet.helius-rpc.com/v1/parsed-events/transaction-history',
    );
    expect(u.searchParams.get('api-key')).toBe('k');
    expect(calls[0]!.body).toEqual({
      address: 'Addr',
      limit: 50,
      sortOrder: 'asc',
      commitment: 'confirmed',
      paginationToken: '433950192:0',
      time: { gte: 1_700_000_000, lte: 1_700_000_120 },
    });
    await h.transactions('Addr');
    expect(calls[1]!.body).toEqual({
      address: 'Addr',
      limit: 100,
      sortOrder: 'desc',
      commitment: 'confirmed',
    });
  });
  it('maps parsed transactions, counts unparsed ones and returns the next cursor, never recording the key', async () => {
    const h = new Helius('secret-key', {
      fetchImpl: fakeFetch([], {
        data: [item({ signature: 's1' }), item({ signature: 's2', parserStatus: 'ERROR' })],
        paginationToken: '433950192:0',
      }),
      sleep: async () => undefined,
    });
    const r = await h.transactions('Addr');
    expect(r.data.next).toBe('433950192:0');
    expect(r.data.unparsed).toBe(1);
    expect(r.data.txs).toEqual([
      {
        signature: 's1',
        slot: 433950192,
        timestamp: 1784487060000,
        type: 'SWAP',
        source: 'jupiter',
        feePayer: 'GV6U',
        failed: false,
        nativeTransfers: [{ from: 'GV6U', to: 'teBP', lamports: 2039280n }],
        tokenTransfers: [{ from: 'Pool', to: 'GV6U', mint: 'pump', uiAmount: '64672839.26195' }],
      },
    ]);
    expect(JSON.stringify(r.provenance)).not.toMatch(/secret-key/);
    const end = new Helius('k', { fetchImpl: fakeFetch([], { data: [] }), sleep: async () => undefined });
    expect((await end.transactions('Addr')).data).toEqual({ txs: [], next: null, unparsed: 0 });
  });
  it('recognises token creation, liquidity removal and failed transactions', () => {
    const create = fromParsedEvent(
      item({
        signature: 'c',
        parsed: { summary: null, instructions: [{ programName: 'pump', instructionName: 'create_v2' }] },
      }),
    );
    expect(create?.type).toBe('CREATE');
    expect(
      fromParsedEvent(
        item({ signature: 'm', parsed: { instructions: [{ instructionName: 'initializeMint2' }] } }),
      )?.type,
    ).toBe('CREATE');
    expect(
      fromParsedEvent(
        item({ signature: 'r', parsed: { summary: { type: 'remove_liquidity' }, instructions: [] } }),
      )?.type,
    ).toBe('WITHDRAW_LIQUIDITY');
    expect(fromParsedEvent(item({ signature: 'u', parsed: { summary: null, instructions: [] } }))?.type).toBe(
      'UNKNOWN',
    );
    expect(
      fromParsedEvent(
        item({ signature: 'f', parsed: { transactionStatus: 'ERROR', error: { InstructionError: [0, 1] } } }),
      )?.failed,
    ).toBe(true);
  });
  it('scales raw token amounts exactly', () => {
    expect(uiAmount(64672839261950, 6)).toBe('64672839.26195');
    expect(uiAmount('1000000', 6)).toBe('1');
    expect(uiAmount(5, 9)).toBe('0.000000005');
    expect(uiAmount(0, 0)).toBe('0');
  });
  it('derives a private Helius RPC from the key unless an RPC is configured', () => {
    expect(rpcUrl({ HELIUS_API_KEY: 'k' })).toBe('https://mainnet.helius-rpc.com/?api-key=k');
    expect(rpcUrl({ HELIUS_API_KEY: 'k', SOLANA_RPC_URL: 'https://x' })).toBe('https://x');
    expect(rpcUrl({})).toBe('https://api.mainnet-beta.solana.com');
  });
  it('books 10 credits a page and makes no request once the daily budget is spent', async () => {
    const calls: Array<{ url: string; body: unknown }> = [];
    const booked: number[] = [];
    let left = 15;
    const h = new Helius('k', {
      fetchImpl: fakeFetch(calls, { data: [] }),
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
    expect(booked).toEqual([10]);
  });
});
