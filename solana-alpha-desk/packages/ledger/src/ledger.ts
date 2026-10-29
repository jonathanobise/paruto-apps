import { newId } from '@alpha-desk/shared';

export const LEDGER_ACCOUNTS = ['CASH', 'POSITION_COST', 'FEES', 'REALIZED_PNL', 'CAPITAL', 'HOLDINGS', 'EXTERNAL'] as const;
export type LedgerAccount = (typeof LEDGER_ACCOUNTS)[number];
export type JournalKind = 'CAPITAL' | 'BUY' | 'SELL' | 'FEE' | 'CORRECTION' | 'ARCHIVE';

export interface LedgerEntry {
  account: LedgerAccount;
  unit: string; // 'USD' (micro) or a mint (base units)
  amount: bigint; // debit positive, credit negative
}

export interface Journal {
  id: string;
  portfolioId: string;
  kind: JournalKind;
  referenceId: string;
  memo: string;
  createdAt: number;
  entries: LedgerEntry[];
}

export class UnbalancedJournalError extends Error {}

/** Every journal must sum to zero for each unit; anything else is refused before it reaches storage. */
export function assertBalanced(j: Journal): void {
  const sums = new Map<string, bigint>();
  for (const e of j.entries) sums.set(e.unit, (sums.get(e.unit) ?? 0n) + e.amount);
  for (const [unit, sum] of sums) if (sum !== 0n) throw new UnbalancedJournalError(`journal ${j.kind}/${j.referenceId} unbalanced in ${unit} by ${sum}`);
  if (j.entries.length < 2) throw new UnbalancedJournalError('journal needs at least two entries');
}

function journal(portfolioId: string, kind: JournalKind, referenceId: string, memo: string, createdAt: number, entries: LedgerEntry[]): Journal {
  const j = { id: newId('jr', createdAt), portfolioId, kind, referenceId, memo, createdAt, entries: entries.filter((e) => e.amount !== 0n) };
  assertBalanced(j);
  return j;
}

export function capitalJournal(portfolioId: string, amountMicro: bigint, at: number, memo = 'paper capital'): Journal {
  return journal(portfolioId, 'CAPITAL', portfolioId, memo, at, [
    { account: 'CASH', unit: 'USD', amount: amountMicro },
    { account: 'CAPITAL', unit: 'USD', amount: -amountMicro },
  ]);
}

export function buyJournal(portfolioId: string, fillId: string, mint: string, qty: bigint, costMicro: bigint, feeMicro: bigint, at: number): Journal {
  return journal(portfolioId, 'BUY', fillId, `paper buy ${mint}`, at, [
    { account: 'POSITION_COST', unit: 'USD', amount: costMicro },
    { account: 'FEES', unit: 'USD', amount: feeMicro },
    { account: 'CASH', unit: 'USD', amount: -(costMicro + feeMicro) },
    { account: 'HOLDINGS', unit: mint, amount: qty },
    { account: 'EXTERNAL', unit: mint, amount: -qty },
  ]);
}

/**
 * Sell: cash receives proceeds net of the network fee; the position's cost basis is relieved and the
 * difference between gross proceeds and cost basis is realised (fees stay in FEES).
 */
export function sellJournal(portfolioId: string, fillId: string, mint: string, qty: bigint, costBasisMicro: bigint, proceedsMicro: bigint, feeMicro: bigint, at: number): Journal {
  return journal(portfolioId, 'SELL', fillId, `paper sell ${mint}`, at, [
    { account: 'CASH', unit: 'USD', amount: proceedsMicro - feeMicro },
    { account: 'FEES', unit: 'USD', amount: feeMicro },
    { account: 'POSITION_COST', unit: 'USD', amount: -costBasisMicro },
    { account: 'REALIZED_PNL', unit: 'USD', amount: -(proceedsMicro - costBasisMicro) },
    { account: 'HOLDINGS', unit: mint, amount: -qty },
    { account: 'EXTERNAL', unit: mint, amount: qty },
  ]);
}

/** A correction is a new balanced journal referencing what it corrects; history is never rewritten. */
export function correctionJournal(portfolioId: string, correctsId: string, memo: string, entries: LedgerEntry[], at: number): Journal {
  return journal(portfolioId, 'CORRECTION', correctsId, memo, at, entries);
}

export type Balances = Map<string, bigint>; // `${account}|${unit}` → amount

export function balancesFrom(rows: Array<{ account: string; unit: string; amount: string | bigint }>): Balances {
  const b: Balances = new Map();
  for (const r of rows) {
    const k = `${r.account}|${r.unit}`;
    b.set(k, (b.get(k) ?? 0n) + BigInt(r.amount));
  }
  return b;
}

export const bal = (b: Balances, account: LedgerAccount, unit = 'USD') => b.get(`${account}|${unit}`) ?? 0n;

export interface ReconPosition {
  id: string;
  mint: string;
  status: string;
  quantity: bigint;
  entryCostMicro: bigint;
  entryFeesMicro: bigint;
  realizedPnlMicro: bigint | null;
  exitFeesMicro: bigint | null;
}

export interface Reconciliation {
  ok: boolean;
  issues: string[];
  cashMicro: bigint;
  expectedCashMicro: bigint;
}

/**
 * Proves the ledger and the position records tell the same story:
 *  - every unit's balances sum to zero (double entry);
 *  - token holdings per mint equal the open positions' quantities;
 *  - open cost basis equals the open positions' entry cost excluding fees;
 *  - cash equals capital + net realised P&L of closed trades − total entry cost of open positions.
 */
export function reconcile(b: Balances, positions: ReconPosition[]): Reconciliation {
  const issues: string[] = [];
  const units = new Map<string, bigint>();
  for (const [k, v] of b) {
    const unit = k.split('|')[1]!;
    units.set(unit, (units.get(unit) ?? 0n) + v);
  }
  for (const [unit, sum] of units) if (sum !== 0n) issues.push(`unit ${unit} does not balance (${sum})`);

  const open = positions.filter((p) => p.status !== 'CLOSED');
  const byMint = new Map<string, bigint>();
  for (const p of open) byMint.set(p.mint, (byMint.get(p.mint) ?? 0n) + p.quantity);
  const mints = new Set([...byMint.keys(), ...[...b.keys()].filter((k) => k.startsWith('HOLDINGS|')).map((k) => k.split('|')[1]!)]);
  for (const m of mints) {
    if (bal(b, 'HOLDINGS', m) !== (byMint.get(m) ?? 0n)) issues.push(`holdings of ${m}: ledger ${bal(b, 'HOLDINGS', m)} ≠ positions ${byMint.get(m) ?? 0n}`);
  }
  const openCost = open.reduce((s, p) => s + (p.entryCostMicro - p.entryFeesMicro), 0n);
  if (bal(b, 'POSITION_COST') !== openCost) issues.push(`open cost basis: ledger ${bal(b, 'POSITION_COST')} ≠ positions ${openCost}`);

  const capital = -bal(b, 'CAPITAL');
  const realisedNet = positions.filter((p) => p.status === 'CLOSED').reduce((s, p) => s + (p.realizedPnlMicro ?? 0n), 0n);
  const expectedCash = capital + realisedNet - open.reduce((s, p) => s + p.entryCostMicro, 0n);
  const cash = bal(b, 'CASH');
  if (cash !== expectedCash) issues.push(`cash: ledger ${cash} ≠ expected ${expectedCash}`);
  if (cash < 0n) issues.push('cash is negative');
  return { ok: issues.length === 0, issues, cashMicro: cash, expectedCashMicro: expectedCash };
}
