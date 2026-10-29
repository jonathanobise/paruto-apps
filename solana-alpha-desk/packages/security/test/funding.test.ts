import { describe, expect, it } from 'vitest';
import { EvidenceCollector, type SolanaRpc } from '@alpha-desk/providers';
import { firstFunder, solFundingInto } from '../src/gather.ts';

const W = 'Wallet1111111111111111111111111111111111111';
const sys = (type: string, info: Record<string, unknown>) => ({ program: 'system', parsed: { type, info } });
const tx = (instructions: unknown[], inner: unknown[] = [], err: unknown = null) => ({
  meta: { err, innerInstructions: inner.length ? [{ index: 0, instructions: inner }] : [] },
  transaction: { message: { instructions } },
});
const obs = <T>(data: T) => ({ data, provenance: { provider: 'solana-rpc', endpoint: 'x', observedAt: 0 } });

describe('wallet funding over RPC', () => {
  it('finds the first SOL transfer or account creation into the wallet, including inner instructions', () => {
    expect(
      solFundingInto(tx([sys('transfer', { source: 'A', destination: W, lamports: 50_000_000 })]), W),
    ).toBe('A');
    expect(
      solFundingInto(
        tx(
          [{ program: 'spl-token' }],
          [sys('createAccount', { source: 'B', newAccount: W, lamports: 20_000_000 })],
        ),
        W,
      ),
    ).toBe('B');
  });
  it('ignores dust, self-transfers, transfers elsewhere and failed transactions', () => {
    expect(
      solFundingInto(tx([sys('transfer', { source: 'A', destination: W, lamports: 5_000 })]), W),
    ).toBeNull();
    expect(solFundingInto(tx([sys('transfer', { source: W, destination: W, lamports: 1e9 })]), W)).toBeNull();
    expect(
      solFundingInto(tx([sys('transfer', { source: 'A', destination: 'C', lamports: 1e9 })]), W),
    ).toBeNull();
    expect(
      solFundingInto(tx([sys('transfer', { source: 'A', destination: W, lamports: 1e9 })], [], { x: 1 }), W),
    ).toBeNull();
  });
  it('pages back to the origin of the history and reads the oldest transactions first', async () => {
    const sigs = Array.from({ length: 1500 }, (_, i) => ({
      signature: `s${i}`,
      slot: 1500 - i,
      blockTime: 0,
      err: null,
    }));
    const opened: string[] = [];
    const rpc = {
      getSignatures: async (_a: string, o: { before?: string; limit?: number }) => {
        const start = o.before ? sigs.findIndex((s) => s.signature === o.before) + 1 : 0;
        return obs(sigs.slice(start, start + (o.limit ?? 1000)));
      },
      getTransaction: async (sig: string) => {
        opened.push(sig);
        return obs(
          sig === 's1498'
            ? tx([sys('transfer', { source: 'Funder', destination: W, lamports: 1e9 })])
            : tx([]),
        );
      },
    } as unknown as SolanaRpc;
    expect(await firstFunder(rpc, W, new EvidenceCollector())).toBe('Funder');
    expect(opened).toEqual(['s1499', 's1498']);
  });
  it('gives no answer when the history is longer than it will page through', async () => {
    const rpc = {
      getSignatures: async (_a: string, o: { before?: string }) =>
        obs(
          Array.from({ length: 1000 }, (_, i) => ({
            signature: `${o.before ?? ''}x${i}`,
            slot: 1,
            blockTime: 0,
            err: null,
          })),
        ),
      getTransaction: async () => obs(null),
    } as unknown as SolanaRpc;
    expect(await firstFunder(rpc, W, new EvidenceCollector(), 2)).toBeNull();
  });
});
