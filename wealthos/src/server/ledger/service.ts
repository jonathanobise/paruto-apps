import "server-only";
import { and, asc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { financialAccounts, instruments, ledgerEntries, ledgerEvents } from "@/server/db/schema";
import { withTenant, type TenantContext, type Tx } from "@/server/db/client";
import { AppError } from "@/server/platform/errors";
import { parseOrThrow } from "@/server/identity/service";
import { recordAudit } from "@/server/audit/audit";
import { InsufficientQuantityError, LedgerValidationError, PortfolioBook, effectiveEvents, eventAccountIds, sortEvents, type InstrumentInfo, type LedgerEvent, ZERO } from "@/engine";
import { eventInputSchema, payloadFromInput, toEngineEvent, type EventInput } from "./codec";
import { toInstrumentInfo } from "@/server/market-data/instruments";

type Source = "manual" | "import" | "demo" | "system";

export async function loadEvents(tx: Tx) {
  return tx.select().from(ledgerEvents).orderBy(asc(ledgerEvents.occurredOn), asc(ledgerEvents.createdAt), asc(ledgerEvents.id));
}

export async function loadInstrumentMap(tx: Tx, ids: string[]): Promise<Map<string, InstrumentInfo>> {
  if (ids.length === 0) return new Map();
  const rows = await tx.select().from(instruments).where(inArray(instruments.id, ids));
  return new Map(rows.map((r) => [r.id, toInstrumentInfo(r)]));
}

export function instrumentIdsOf(events: LedgerEvent[]): string[] {
  const ids = new Set<string>();
  for (const e of events) if ("instrumentId" in e && e.instrumentId) ids.add(e.instrumentId);
  return [...ids];
}

function friendly(err: unknown): never {
  if (err instanceof InsufficientQuantityError) {
    throw new AppError("LEDGER_REJECTED", `This would leave a negative holding: only ${err.held.toFixed()} units are held in that account at that date. Check the quantity and date, or record the earlier purchase first.`);
  }
  if (err instanceof LedgerValidationError) throw new AppError("LEDGER_REJECTED", err.message.replace(/^Event [^:]+: /, ""));
  throw err;
}

interface EntryRow {
  accountId: string;
  instrumentId: string | null;
  currency: string;
  cashDelta: string;
  quantityDelta: string;
}

/** Per-account cash and position deltas caused by applying `event` to `before`. */
function diffEntries(before: PortfolioBook, after: PortfolioBook): EntryRow[] {
  const snap = (b: PortfolioBook) => {
    const m = new Map<string, { accountId: string; instrumentId: string | null; currency: string; cash: typeof ZERO; qty: typeof ZERO }>();
    for (const c of b.cashBalances()) m.set(`${c.accountId}|cash|${c.currency}`, { accountId: c.accountId, instrumentId: null, currency: c.currency, cash: c.amount, qty: ZERO });
    for (const p of b.positions()) m.set(`${p.accountId}|${p.instrumentId}|${p.currency}`, { accountId: p.accountId, instrumentId: p.instrumentId, currency: p.currency, cash: ZERO, qty: p.quantity });
    return m;
  };
  const a = snap(before);
  const b = snap(after);
  const keys = new Set([...a.keys(), ...b.keys()]);
  const out: EntryRow[] = [];
  for (const k of keys) {
    const x = a.get(k);
    const y = b.get(k);
    const base = (y ?? x)!;
    const cash = (y?.cash ?? ZERO).minus(x?.cash ?? ZERO);
    const qty = (y?.qty ?? ZERO).minus(x?.qty ?? ZERO);
    if (!cash.isZero() || !qty.isZero()) out.push({ accountId: base.accountId, instrumentId: base.instrumentId, currency: base.currency, cashDelta: cash.toFixed(), quantityDelta: qty.toFixed() });
  }
  return out;
}

async function checkAccounts(tx: Tx, input: EventInput): Promise<void> {
  const ids = "accountId" in input ? [input.accountId] : "fromAccountId" in input ? [input.fromAccountId, input.toAccountId] : [];
  if (ids.length === 0) return;
  const rows = await tx.select().from(financialAccounts).where(inArray(financialAccounts.id, ids));
  for (const id of ids) {
    const acc = rows.find((r) => r.id === id);
    if (!acc) throw new AppError("NOT_FOUND", "Account not found.");
    if (acc.accountClass !== "ledger") throw new AppError("VALIDATION", `${acc.name} is valued manually; add a valuation instead of a transaction.`);
    if (acc.status === "closed" && acc.closedOn && input.occurredOn > acc.closedOn) throw new AppError("VALIDATION", `${acc.name} was closed on ${acc.closedOn}.`);
  }
}

async function checkInstrument(tx: Tx, input: EventInput): Promise<void> {
  if (!("instrumentId" in input) || !input.instrumentId) return;
  const [inst] = await tx.select({ id: instruments.id, currency: instruments.currency }).from(instruments).where(and(eq(instruments.id, input.instrumentId), or(isNull(instruments.orgId), eq(instruments.orgId, sql`app_current_org()`)))).limit(1);
  if (!inst) throw new AppError("NOT_FOUND", "Instrument not found.");
  if ("currency" in input && input.type !== "dividend" && input.type !== "interest" && input.type !== "coupon" && input.type !== "fee" && input.type !== "tax" && input.currency !== inst.currency) {
    throw new AppError("VALIDATION", `This instrument trades in ${inst.currency}. Record an FX conversion first if you paid in another currency.`);
  }
}

export interface PostedEvent {
  id: string;
  duplicate: boolean;
}

/**
 * Validate and append one event. The whole ledger is replayed with the new event so that
 * backdated entries that would invalidate later history (e.g. a sale of units no longer held)
 * are rejected. Ledger writes are serialised per organisation with an advisory lock.
 */
export async function postEvent(ctx: TenantContext, rawInput: unknown, source: Source = "manual"): Promise<PostedEvent> {
  const input = parseOrThrow(eventInputSchema, rawInput);
  const today = new Date().toISOString().slice(0, 10);
  if (input.occurredOn > today) throw new AppError("VALIDATION", "Transactions cannot be dated in the future. Use alerts for upcoming events.", { fieldErrors: { occurredOn: ["Cannot be in the future"] } });
  if (input.type === "opening_position" && input.acquiredOn > input.occurredOn) throw new AppError("VALIDATION", "Acquisition date must be on or before the entry date.");
  if ((input.type === "transfer" || input.type === "security_transfer") && input.fromAccountId === input.toAccountId) throw new AppError("VALIDATION", "Choose two different accounts.");

  return withTenant(ctx, async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${ctx.orgId}, 0))`);
    if (input.idempotencyKey) {
      const [dup] = await tx.select({ id: ledgerEvents.id }).from(ledgerEvents).where(eq(ledgerEvents.idempotencyKey, input.idempotencyKey)).limit(1);
      if (dup) return { id: dup.id, duplicate: true };
    }
    await checkAccounts(tx, input);
    await checkInstrument(tx, input);

    const existingRows = await loadEvents(tx);
    const existing = existingRows.map(toEngineEvent);
    const candidateId = crypto.randomUUID();
    const candidate = toEngineEvent({ id: candidateId, type: input.type, occurredOn: input.occurredOn, payload: payloadFromInput(input), reversesEventId: null });
    const instrumentMap = await loadInstrumentMap(tx, instrumentIdsOf([...existing, candidate]));
    const opts = { baseCurrency: "NGN", instruments: instrumentMap };

    let entries: EntryRow[];
    try {
      // Full replay including the new event validates all later history.
      PortfolioBook.replay([...existing, candidate], opts);
      const effective = sortEvents(effectiveEvents(existing)).filter((e) => e.date <= candidate.date);
      const before = new PortfolioBook(opts);
      for (const e of effective) before.apply(e);
      const after = new PortfolioBook(opts);
      for (const e of effective) after.apply(e);
      after.apply(candidate);
      entries = diffEntries(before, after);
    } catch (err) {
      friendly(err);
    }

    await tx.insert(ledgerEvents).values({ id: candidateId, orgId: ctx.orgId, type: input.type, occurredOn: input.occurredOn, payload: payloadFromInput(input), description: input.description ?? null, source, idempotencyKey: input.idempotencyKey ?? null, createdBy: ctx.userId });
    if (entries.length) await tx.insert(ledgerEntries).values(entries.map((e) => ({ ...e, orgId: ctx.orgId, eventId: candidateId })));
    await recordAudit(tx, { orgId: ctx.orgId, actorUserId: ctx.userId, action: "ledger.event_posted", targetType: "ledger_event", targetId: candidateId, metadata: { type: input.type, source } });
    return { id: candidateId, duplicate: false };
  });
}

/** Cancel an event by appending a reversal. The original stays in the ledger for audit. */
export async function reverseEvent(ctx: TenantContext, eventId: string, reason: string): Promise<{ id: string }> {
  const why = reason.trim();
  if (why.length < 3) throw new AppError("VALIDATION", "Say briefly why this entry is being reversed.", { fieldErrors: { reason: ["Required"] } });
  return withTenant(ctx, async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${ctx.orgId}, 0))`);
    const rows = await loadEvents(tx);
    const target = rows.find((r) => r.id === eventId);
    if (!target) throw new AppError("NOT_FOUND", "Transaction not found.");
    if (target.type === "reversal") throw new AppError("VALIDATION", "A reversal cannot itself be reversed. Record the transaction again instead.");
    if (rows.some((r) => r.reversesEventId === eventId)) throw new AppError("CONFLICT", "This transaction has already been reversed.");
    const events = rows.map(toEngineEvent);
    const reversalId = crypto.randomUUID();
    const today = new Date().toISOString().slice(0, 10);
    const reversal: LedgerEvent = { id: reversalId, date: today < target.occurredOn ? target.occurredOn : today, type: "reversal", reversesEventId: eventId };
    try {
      const instrumentMap = await loadInstrumentMap(tx, instrumentIdsOf(events));
      PortfolioBook.replay([...events, reversal], { baseCurrency: "NGN", instruments: instrumentMap });
    } catch (err) {
      if (err instanceof InsufficientQuantityError) throw new AppError("LEDGER_REJECTED", "Later transactions depend on this one (for example a sale of these units). Reverse those first.");
      friendly(err);
    }
    const original = await tx.select().from(ledgerEntries).where(eq(ledgerEntries.eventId, eventId));
    await tx.insert(ledgerEvents).values({ id: reversalId, orgId: ctx.orgId, type: "reversal", occurredOn: reversal.date, payload: { reason: why }, description: `Reversal: ${why}`, reversesEventId: eventId, source: "manual", createdBy: ctx.userId });
    if (original.length) {
      await tx.insert(ledgerEntries).values(original.map((e) => ({ orgId: ctx.orgId, eventId: reversalId, accountId: e.accountId, instrumentId: e.instrumentId, currency: e.currency, cashDelta: negate(e.cashDelta), quantityDelta: negate(e.quantityDelta) })));
    }
    await recordAudit(tx, { orgId: ctx.orgId, actorUserId: ctx.userId, action: "ledger.event_reversed", targetType: "ledger_event", targetId: eventId, metadata: { reversalId, reason: why } });
    return { id: reversalId };
  });
}

function negate(v: string): string {
  return v.startsWith("-") ? v.slice(1) : v === "0" ? "0" : `-${v}`;
}

export { eventAccountIds };
