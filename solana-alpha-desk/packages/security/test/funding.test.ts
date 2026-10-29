import { describe, expect, it } from 'vitest';
import { EvidenceCollector, type Helius, type SolanaRpc } from '@alpha-desk/providers';
import { feePayerOf, firstFunder, isFundingHub, mintCreator, solFundingInto } from '../src/gather.ts';

const W = 'Wallet1111111111111111111111111111111111111';
const sys = (type: string, info: Record<string, unknown>) => ({ program: 'system', parsed: { type, info } });
const tx = (instructions: unknown[], inner: unknown[] = [], err: unknown = null) => ({
  meta: { err, innerInstructions: inner.length ? [{ index: 0, instructions: inner }] : [] },
  transaction: { message: { instructions } },
});
const longHistory = {
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
  it('credits the fee payer when SOL arrives indirectly (a temporary wrapped-SOL account closed into it)', () => {
    const viaClose = {
      meta: {
        err: null,
        innerInstructions: [],
        preBalances: [5e9, 0, 2e6],
        postBalances: [4.95e9, 44_544_633, 0],
      },
      transaction: {
        message: {
          accountKeys: [{ pubkey: 'Payer' }, { pubkey: W }, { pubkey: 'TempWsol' }],
          instructions: [
            sys('createAccountWithSeed', { source: 'Payer', newAccount: 'TempWsol', lamports: 44_544_633 }),
            {
              program: 'spl-token',
              parsed: { type: 'closeAccount', info: { account: 'TempWsol', destination: W } },
            },
          ],
        },
      },
    };
    expect(solFundingInto(viaClose, W)).toBe('Payer');
    const dust = structuredClone(viaClose);
    dust.meta.postBalances[1] = 5_000;
    expect(solFundingInto(dust, W)).toBeNull();
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
    expect(await firstFunder(rpc, W, new EvidenceCollector())).toEqual({ funder: 'Funder', traced: true });
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
    expect(await firstFunder(rpc, W, new EvidenceCollector(), { maxPages: 2 })).toEqual({
      funder: null,
      traced: false,
    });
  });
  it('falls back to one indexer read (oldest page) for a wallet whose history is too long', async () => {
    const asked: unknown[] = [];
    const indexer = {
      transactions: async (address: string, o: unknown) => {
        asked.push([address, o]);
        return obs([
          {
            signature: 'a',
            slot: 1,
            timestamp: 1,
            type: 'TRANSFER',
            source: null,
            feePayer: 'X',
            failed: false,
            nativeTransfers: [{ from: 'OldFunder', to: W, lamports: 2_000_000_000n }],
            tokenTransfers: [],
          },
        ]);
      },
    } as unknown as Helius;
    expect(await firstFunder(longHistory, W, new EvidenceCollector(), { indexer, maxPages: 2 })).toEqual({
      funder: 'OldFunder',
      traced: true,
    });
    expect(asked).toEqual([[W, { sortOrder: 'asc', limit: 25 }]]);
  });
});

describe('mint creator', () => {
  it("is the fee payer of the mint's first successful transaction", async () => {
    const sigs = [
      { signature: 'later', slot: 3, blockTime: 0, err: null },
      { signature: 'init', slot: 2, blockTime: 0, err: null },
      { signature: 'failed', slot: 1, blockTime: 0, err: { x: 1 } },
    ];
    const rpc = {
      getSignatures: async () => obs(sigs),
      getTransaction: async (sig: string) =>
        obs({
          transaction: {
            message: { accountKeys: [{ pubkey: sig === 'init' ? 'Creator' : 'Other', signer: true }] },
          },
        }),
    } as unknown as SolanaRpc;
    expect(await mintCreator(rpc, 'Mint', new EvidenceCollector())).toEqual({
      creator: 'Creator',
      reached: true,
    });
  });
  it('is unknown, not guessed, when the history is too long to page back to the start', async () => {
    expect(await mintCreator(longHistory, 'Mint', new EvidenceCollector(), 2)).toEqual({
      creator: null,
      reached: false,
    });
  });
  it('reads fee payers from both account-key encodings', () => {
    expect(feePayerOf({ transaction: { message: { accountKeys: ['P', 'Q'] } } })).toBe('P');
    expect(feePayerOf({ transaction: { message: { accountKeys: [{ pubkey: 'P' }] } } })).toBe('P');
    expect(feePayerOf({})).toBeNull();
  });
});

describe('funding hubs', () => {
  const activity = (count: number, spanSeconds: number) =>
    ({
      getSignatures: async () =>
        obs(
          Array.from({ length: count }, (_, i) => ({
            signature: `h${i}`,
            slot: 1,
            blockTime: 1_000_000 - Math.round((i * spanSeconds) / Math.max(1, count - 1)),
            err: null,
          })),
        ),
    }) as unknown as SolanaRpc;
  it('treats a wallet with 1,000 transactions in under a day as a service wallet', async () => {
    expect(await isFundingHub(activity(1000, 9 * 60), 'Hub', new EvidenceCollector())).toBe(true);
  });
  it('treats a quiet or slow wallet as a possible link', async () => {
    expect(await isFundingHub(activity(40, 600), 'Bundler', new EvidenceCollector())).toBe(false);
    expect(await isFundingHub(activity(1000, 30 * 86_400), 'Old', new EvidenceCollector())).toBe(false);
  });
});
