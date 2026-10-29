import { describe, expect, it } from 'vitest';
import {
  assertBalanced,
  balancesFrom,
  bal,
  buildAudit,
  buyJournal,
  capitalJournal,
  reconcile,
  sellJournal,
  verifyAudit,
  UnbalancedJournalError,
  correctionJournal,
} from '../src/index.ts';

const P = 'pf_1';
const rows = (...js: ReturnType<typeof capitalJournal>[]) =>
  js.flatMap((j) => j.entries.map((e) => ({ ...e, amount: e.amount })));

describe('double-entry ledger', () => {
  it('refuses unbalanced journals', () => {
    expect(() =>
      assertBalanced({
        id: 'j',
        portfolioId: P,
        kind: 'CORRECTION',
        referenceId: 'x',
        memo: '',
        createdAt: 0,
        entries: [
          { account: 'CASH', unit: 'USD', amount: 1n },
          { account: 'FEES', unit: 'USD', amount: 0n },
        ],
      }),
    ).toThrow(UnbalancedJournalError);
    expect(() =>
      correctionJournal(
        P,
        'x',
        'bad',
        [
          { account: 'CASH', unit: 'USD', amount: 5n },
          { account: 'FEES', unit: 'USD', amount: -4n },
        ],
        0,
      ),
    ).toThrow();
  });
  it('reconciles a full buy → sell lifecycle', () => {
    const cap = capitalJournal(P, 10_000_000_000n, 0);
    const buy = buyJournal(P, 'f1', 'MINT', 1_000_000n, 500_000_000n, 1_000n, 1);
    let b = balancesFrom(rows(cap, buy));
    const open = [
      {
        id: 'p',
        mint: 'MINT',
        status: 'OPEN',
        quantity: 1_000_000n,
        entryCostMicro: 500_001_000n,
        entryFeesMicro: 1_000n,
        realizedPnlMicro: null,
        exitFeesMicro: null,
      },
    ];
    expect(reconcile(b, open)).toMatchObject({ ok: true });
    expect(bal(b, 'CASH')).toBe(9_499_999_000n);

    const sell = sellJournal(P, 'f2', 'MINT', 1_000_000n, 500_000_000n, 560_000_000n, 1_000n, 2);
    b = balancesFrom(rows(cap, buy, sell));
    const closed = [
      {
        ...open[0]!,
        status: 'CLOSED',
        realizedPnlMicro: 560_000_000n - 1_000n - 500_001_000n,
        exitFeesMicro: 1_000n,
      },
    ];
    const r = reconcile(b, closed);
    expect(r.issues).toEqual([]);
    expect(bal(b, 'HOLDINGS', 'MINT')).toBe(0n);
    expect(bal(b, 'REALIZED_PNL')).toBe(-60_000_000n);
    expect(bal(b, 'FEES')).toBe(2_000n);
  });
  it('detects a mismatch between ledger and positions', () => {
    const b = balancesFrom(rows(capitalJournal(P, 1_000n, 0), buyJournal(P, 'f', 'M', 10n, 100n, 0n, 1)));
    expect(reconcile(b, []).ok).toBe(false);
  });
});

describe('audit records', () => {
  it('are checksummed and tamper-evident', async () => {
    const a = await buildAudit({
      category: 'RISK',
      action: 'RISK_AUTHORIZED',
      actor: 'RISK',
      detail: { n: 1n },
      at: 1,
    });
    expect(await verifyAudit(a)).toBe(true);
    expect(await verifyAudit({ ...a, detail: '{"n":"2"}' })).toBe(false);
  });
});
