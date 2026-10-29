import { describe, expect, it } from 'vitest';
import { SolanaRpc } from '../src/index.ts';

describe('Solana RPC adapter', () => {
  it('accepts version-1 transactions (the RPC refuses them with error -32015 otherwise)', async () => {
    const bodies: unknown[] = [];
    const rpc = new SolanaRpc('https://rpc.test', {
      fetchImpl: (async (_u: string | URL | Request, init?: RequestInit) => {
        bodies.push(JSON.parse(String(init?.body)));
        return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { version: 1 } }));
      }) as typeof fetch,
      sleep: async () => undefined,
    });
    expect((await rpc.getTransaction('sig')).data).toEqual({ version: 1 });
    expect(bodies[0]).toMatchObject({
      method: 'getTransaction',
      params: ['sig', { encoding: 'jsonParsed', maxSupportedTransactionVersion: 1 }],
    });
  });
});
