import "server-only";
import { and, asc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { financialAccounts, instruments, ledgerEntries, ledgerEvents } from "@/server/db/schema";
import { withTenant, type TenantContext, type Tx } from "@/server/db/client";
import { AppError } from "@/server/platform/errors";
import { parseOrThrow } from "@/server/identity/service";
import { recordAudit } from "@/server/audit/audit";
import { InsufficientQuantityError, PortfolioBook, eventAccountIds, type InstrumentInfo, type LedgerEvent } from "@/engine";
import { eventInputSchema, payloadFromInput, toEngineEvent, type EventInput } from "./codec";
import { computeEntries, failingEventId, ledgerErrorMessage, type EntryRow } from "./replay";
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

/** Serialise ledger writes per organisation so concurrent postings can't both pass validation. */
export async function lockLedger(tx: Tx, orgId: string): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${orgId}, 0))`);
}

async function checkAccounts(tx: Tx, inputs: EventInput[]): Promise<void> {
  const ids = [...new Set(inputs.flatMap((input) => ("accountId" in input ? [input.accountId] : "fromAccountId" in input ? [input.fromAccountId, input.toAccountId] : [])))];
  if (ids.length === 0) return;
  const rows = await tx.select().from(financialAccounts).where(inArray(financialAccounts.id, ids));
  for (const input of inputs) {
    const accIds = "accountId" in input ? [input.accountId] : "fromAccountId" in input ? [input.fromAccountId, input.toAccountId] : [];
    for (const id of accIds) {
      const acc = rows.find((r) => r.id === id);
      if (!acc) throw new AppError("NOT_FOUND", "Account not found.");
      if (acc.accountClass !== "ledger") throw new AppError("VALIDATION", `${acc.name} is valued manually; add a valuation instead of a transaction.`);
      if (acc.status === "closed" && acc.closedOn && input.occurredOn > acc.closedOn) throw new AppError("VALIDATION", `${acc.name} was closed on ${acc.closedOn}.`);
    }
  }
}

async function checkInstruments(tx: Tx, inputs: EventInput[]): Promise<void> {
  const ids = [...new Set(inputs.flatMap((i) => ("instrumentId" in i && i.instrumentId ? [i.instrumentId] : [])))];
  if (ids.length === 0) return;
  const rows = await tx.select({ id: instruments.id, currency: instruments.currency }).from(instruments).where(and(inArray(instruments.id, ids), or(isNull(instruments.orgId), eq(instruments.orgId, sql`app_current_org()`))));
  for (const input of inputs) {
    if (!("instrumentId" in input) || !input.instrumentId) continue;
    const inst = rows.find((r) => r.id === input.instrumentId);
    if (!inst) throw new AppError("NOT_FOUND", "Instrument not found.");
    if ("currency" in input && !["dividend", "interest", "coupon", "fee", "tax"].includes(input.type) && input.currency !== inst.currency) {
      throw new AppError("VALIDATION", `This instrument trades in ${inst.currency}. Record an FX conversion first if you paid in another currency.`);
    }
  }
}

function basicChecks(input: EventInput, today: string): void {
  if (input.occurredOn > today) throw new AppError("VALIDATION", "Transactions cannot be dated in the future. Use alerts for upcoming events.", { fieldErrors: { occurredOn: ["Cannot be in the future"] } });
  if (input.type === "opening_position" && input.acquiredOn > input.occurredOn) throw new AppError("VALIDATION", "Acquisition date must be on or before the entry date.");
  if ((input.type === "transfer" || input.type === "security_transfer") && input.fromAccountId === input.toAccountId) throw new AppError("VALIDATION", "Choose two different accounts.");
}

export interface PostingRequest {
  input: EventInput;
  externalRef?: string | null;
  /** Caller reference (e.g. CSV row number) echoed back in errors. */
  ref?: string;
}

export interface PostingOptions {
  source: Source;
  importBatchId?: string;
}

/**
 * Validate and append a batch of events inside an existing tenant transaction, atomically: the
 * entire ledger is replayed with all candidates, and if any candidate fails nothing is written.
 * The caller must hold the ledger lock (lockLedger).
 */
export async function postEventsInTx(tx: Tx, ctx: TenantContext, requests: PostingRequest[], opts: PostingOptions): Promise<string[]> {
  const today = new Date().toISOString().slice(0, 10);
  const inputs = requests.map((r) => r.input);
  for (const input of inputs) basicChecks(input, today);
  await checkAccounts(tx, inputs);
  await checkInstruments(tx, inputs);

  const existing = (await loadEvents(tx)).map(toEngineEvent);
  const ids = requests.map(() => crypto.randomUUID());
  const candidates = requests.map((r, i) => toEngineEvent({ id: ids[i]!, type: r.input.type, occurredOn: r.input.occurredOn, payload: payloadFromInput(r.input), reversesEventId: null }));
  const instrumentMap = await loadInstrumentMap(tx, instrumentIdsOf([...existing, ...candidates]));
  let entries: Map<string, EntryRow[]>;
  try {
    entries = computeEntries(existing, candidates, { baseCurrency: "NGN", instruments: instrumentMap });
  } catch (err) {
    const msg = ledgerErrorMessage(err);
    if (!msg) throw err;
    const idx = ids.indexOf(failingEventId(err) ?? "");
    const where = idx >= 0 && requests[idx]!.ref ? `${requests[idx]!.ref}: ` : "";
    const sentence = msg.startsWith("would") ? `This ${msg}. Check the quantity and date, or record the earlier purchase first.` : msg;
    throw new AppError("LEDGER_REJECTED", `${where}${sentence}`, { ref: idx >= 0 ? requests[idx]!.ref : undefined });
  }

  await tx.insert(ledgerEvents).values(
    requests.map((r, i) => ({
      id: ids[i]!,
      orgId: ctx.orgId,
      type: r.input.type,
      occurredOn: r.input.occurredOn,
      payload: payloadFromInput(r.input),
      description: r.input.description ?? null,
      source: opts.source,
      idempotencyKey: r.input.idempotencyKey ?? null,
      importBatchId: opts.importBatchId ?? null,
      externalRef: r.externalRef ?? null,
      createdBy: ctx.userId,
    })),
  );
  const rows = ids.flatMap((id) => (entries.get(id) ?? []).map((e) => ({ ...e, orgId: ctx.orgId, eventId: id })));
  for (let i = 0; i < rows.length; i += 1000) await tx.insert(ledgerEntries).values(rows.slice(i, i + 1000));
  if (opts.importBatchId) {
    await recordAudit(tx, { orgId: ctx.orgId, actorUserId: ctx.userId, action: "ledger.events_imported", targetType: "import_batch", targetId: opts.importBatchId, metadata: { count: ids.length } });
  } else {
    for (const [i, id] of ids.entries()) await recordAudit(tx, { orgId: ctx.orgId, actorUserId: ctx.userId, action: "ledger.event_posted", targetType: "ledger_event", targetId: id, metadata: { type: inputs[i]!.type, source: opts.source } });
  }
  return ids;
}

export interface PostedEvent {
  id: string;
  duplicate: boolean;
}

/** Validate and append one event (manual entry form, demo builder). */
export async function postEvent(ctx: TenantContext, rawInput: unknown, source: Source = "manual"): Promise<PostedEvent> {
  const input = parseOrThrow(eventInputSchema, rawInput);
  basicChecks(input, new Date().toISOString().slice(0, 10));
  return withTenant(ctx, async (tx) => {
    await lockLedger(tx, ctx.orgId);
    if (input.idempotencyKey) {
      const [dup] = await tx.select({ id: ledgerEvents.id }).from(ledgerEvents).where(eq(ledgerEvents.idempotencyKey, input.idempotencyKey)).limit(1);
      if (dup) return { id: dup.id, duplicate: true };
    }
    const [id] = await postEventsInTx(tx, ctx, [{ input }], { source });
    return { id: id!, duplicate: false };
  });
}

/**
 * Append reversals for `eventIds` inside an existing tenant transaction (caller holds the lock).
 * Validates that the ledger stays consistent without them — e.g. a purchase that a later sale
 * depends on cannot be reversed alone. Originals are never modified.
 */
export async function reverseEventsInTx(tx: Tx, ctx: TenantContext, eventIds: string[], reason: string, auditAction = "ledger.event_reversed"): Promise<string[]> {
  const rows = await loadEvents(tx);
  const targets = eventIds.map((id) => rows.find((r) => r.id === id));
  if (targets.some((t) => !t)) throw new AppError("NOT_FOUND", "Transaction not found.");
  for (const t of targets) {
    if (t!.type === "reversal") throw new AppError("VALIDATION", "A reversal cannot itself be reversed. Record the transaction again instead.");
    if (rows.some((r) => r.reversesEventId === t!.id)) throw new AppError("CONFLICT", "This transaction has already been reversed.");
  }
  const events = rows.map(toEngineEvent);
  const today = new Date().toISOString().slice(0, 10);
  const reversals: LedgerEvent[] = targets.map((t) => ({ id: crypto.randomUUID(), date: today < t!.occurredOn ? t!.occurredOn : today, type: "reversal", reversesEventId: t!.id }));
  try {
    const instrumentMap = await loadInstrumentMap(tx, instrumentIdsOf(events));
    PortfolioBook.replay([...events, ...reversals], { baseCurrency: "NGN", instruments: instrumentMap });
  } catch (err) {
    if (err instanceof InsufficientQuantityError) {
      throw new AppError("LEDGER_REJECTED", eventIds.length > 1 ? "Later transactions depend on these entries (for example a sale of imported units). Reverse those first." : "Later transactions depend on this one (for example a sale of these units). Reverse those first.");
    }
    const msg = ledgerErrorMessage(err);
    if (msg) throw new AppError("LEDGER_REJECTED", msg);
    throw err;
  }
  const original = await tx.select().from(ledgerEntries).where(inArray(ledgerEntries.eventId, eventIds));
  await tx.insert(ledgerEvents).values(
    reversals.map((r) => ({ id: r.id, orgId: ctx.orgId, type: "reversal", occurredOn: r.date, payload: { reason }, description: `Reversal: ${reason}`, reversesEventId: (r as { reversesEventId: string }).reversesEventId, source: "manual" as const, createdBy: ctx.userId })),
  );
  const reversalOf = new Map(reversals.map((r) => [(r as { reversesEventId: string }).reversesEventId, r.id]));
  const negated = original.map((e) => ({ orgId: ctx.orgId, eventId: reversalOf.get(e.eventId)!, accountId: e.accountId, instrumentId: e.instrumentId, currency: e.currency, cashDelta: negate(e.cashDelta), quantityDelta: negate(e.quantityDelta) }));
  for (let i = 0; i < negated.length; i += 1000) await tx.insert(ledgerEntries).values(negated.slice(i, i + 1000));
  if (eventIds.length === 1) await recordAudit(tx, { orgId: ctx.orgId, actorUserId: ctx.userId, action: auditAction, targetType: "ledger_event", targetId: eventIds[0]!, metadata: { reversalId: reversals[0]!.id, reason } });
  return reversals.map((r) => r.id);
}

/** Cancel an event by appending a reversal. The original stays in the ledger for audit. */
export async function reverseEvent(ctx: TenantContext, eventId: string, reason: string): Promise<{ id: string }> {
  const why = reason.trim();
  if (why.length < 3) throw new AppError("VALIDATION", "Say briefly why this entry is being reversed.", { fieldErrors: { reason: ["Required"] } });
  return withTenant(ctx, async (tx) => {
    await lockLedger(tx, ctx.orgId);
    const [id] = await reverseEventsInTx(tx, ctx, [eventId], why);
    return { id: id! };
  });
}

function negate(v: string): string {
  return v.startsWith("-") ? v.slice(1) : v === "0" ? "0" : `-${v}`;
}

export { eventAccountIds };
