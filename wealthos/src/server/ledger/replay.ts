/**
 * Pure ledger replay helpers shared by single postings, CSV imports and reversals.
 * No database access: callers load events and pass them in.
 */
import { InsufficientQuantityError, LedgerValidationError, PortfolioBook, ZERO, effectiveEvents, sortEvents, type BookOptions, type LedgerEvent } from "@/engine";

export interface EntryRow {
  accountId: string;
  instrumentId: string | null;
  currency: string;
  cashDelta: string;
  quantityDelta: string;
}

type Snapshot = Map<string, { accountId: string; instrumentId: string | null; currency: string; cash: typeof ZERO; qty: typeof ZERO }>;

function snapshot(b: PortfolioBook): Snapshot {
  const m: Snapshot = new Map();
  for (const c of b.cashBalances()) m.set(`${c.accountId}|cash|${c.currency}`, { accountId: c.accountId, instrumentId: null, currency: c.currency, cash: c.amount, qty: ZERO });
  for (const p of b.positions()) m.set(`${p.accountId}|${p.instrumentId}|${p.currency}`, { accountId: p.accountId, instrumentId: p.instrumentId, currency: p.currency, cash: ZERO, qty: p.quantity });
  return m;
}

function diff(a: Snapshot, b: Snapshot): EntryRow[] {
  const out: EntryRow[] = [];
  for (const k of new Set([...a.keys(), ...b.keys()])) {
    const x = a.get(k);
    const y = b.get(k);
    const base = (y ?? x)!;
    const cash = (y?.cash ?? ZERO).minus(x?.cash ?? ZERO);
    const qty = (y?.qty ?? ZERO).minus(x?.qty ?? ZERO);
    if (!cash.isZero() || !qty.isZero()) out.push({ accountId: base.accountId, instrumentId: base.instrumentId, currency: base.currency, cashDelta: cash.toFixed(), quantityDelta: qty.toFixed() });
  }
  return out;
}

/**
 * Validate `candidates` against the existing ledger and compute each candidate's per-account
 * effect. The whole ledger (existing + candidates) is replayed in date order, so a backdated
 * candidate that breaks later history is rejected. Throws the engine error of the first failure;
 * its `eventId` identifies the offending event.
 */
export function computeEntries(existing: LedgerEvent[], candidates: LedgerEvent[], opts: BookOptions): Map<string, EntryRow[]> {
  const candidateIds = new Set(candidates.map((c) => c.id));
  const ordered = sortEvents(effectiveEvents([...existing, ...candidates]));
  const book = new PortfolioBook(opts);
  const entries = new Map<string, EntryRow[]>();
  for (const e of ordered) {
    if (!candidateIds.has(e.id)) {
      book.apply(e);
      continue;
    }
    const before = snapshot(book);
    book.apply(e);
    entries.set(e.id, diff(before, snapshot(book)));
  }
  return entries;
}

export function failingEventId(err: unknown): string | null {
  if (err instanceof InsufficientQuantityError || err instanceof LedgerValidationError) return err.eventId;
  return null;
}

export function ledgerErrorMessage(err: unknown): string | null {
  if (err instanceof InsufficientQuantityError) return `would leave a negative holding: only ${err.held.toFixed()} units are held in that account at that date`;
  if (err instanceof LedgerValidationError) return err.message.replace(/^Event [^:]+: /, "");
  return null;
}

/**
 * Dry run for a batch: repeatedly replay, removing each candidate that the ledger rejects, until
 * the remaining set is consistent. Returns the reason for every rejected candidate. If an existing
 * event (not a candidate) fails, the existing ledger itself is inconsistent and the error is thrown.
 */
export function dryRunCandidates(existing: LedgerEvent[], candidates: LedgerEvent[], opts: BookOptions, maxRounds = 200): { accepted: LedgerEvent[]; rejected: Map<string, string> } {
  let remaining = [...candidates];
  const rejected = new Map<string, string>();
  for (let round = 0; round < maxRounds; round++) {
    try {
      computeEntries(existing, remaining, opts);
      return { accepted: remaining, rejected };
    } catch (err) {
      const id = failingEventId(err);
      if (!id || !remaining.some((c) => c.id === id)) throw err;
      rejected.set(id, ledgerErrorMessage(err)!);
      remaining = remaining.filter((c) => c.id !== id);
    }
  }
  for (const c of remaining) rejected.set(c.id, "not checked: too many errors in this file — fix the earlier rows first");
  return { accepted: [], rejected };
}
