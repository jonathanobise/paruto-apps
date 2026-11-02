import "server-only";
import { enforceLimit } from "@/server/billing/entitlements";
import { and, desc, eq, inArray, isNotNull, lt } from "drizzle-orm";
import { z } from "zod";
import { financialAccounts, importBatches, importMappings, instrumentIdentifiers, instruments, ledgerEvents } from "@/server/db/schema";
import { withTenant, type TenantContext, type Tx } from "@/server/db/client";
import { AppError } from "@/server/platform/errors";
import { rateLimit } from "@/server/platform/rate-limit";
import { recordAudit } from "@/server/audit/audit";
import { parseOrThrow } from "@/server/identity/service";
import { loadEvents, loadInstrumentMap, instrumentIdsOf, lockLedger, postEventsInTx, reverseEventsInTx } from "@/server/ledger/service";
import { dryRunCandidates } from "@/server/ledger/replay";
import { payloadFromInput, toEngineEvent } from "@/server/ledger/codec";
import { CsvRejectedError, DATE_FORMATS, IMPORTABLE_TYPES, IMPORT_FIELDS, decodeCsv, fingerprintOf, markDuplicates, parseCsv, prepareRows, sha256Hex, suggestMapping, summarise, type ImportField, type ImportMapping, type InstrumentRef, type ParsedCsv, type PreparedRow } from "./csv";

const PREVIEW_TTL_HOURS = 24;

export const mappingSchema = z.object({
  columns: z.partialRecord(z.enum(Object.keys(IMPORT_FIELDS) as [ImportField, ...ImportField[]]), z.string().trim().max(120)).transform((c) => Object.fromEntries(Object.entries(c).filter(([, v]) => v)) as Partial<Record<ImportField, string>>),
  dateFormat: z.enum(DATE_FORMATS),
  typeAliases: z.record(z.string().trim().min(1).max(60), z.enum(IMPORTABLE_TYPES)).default({}),
});

function wrapCsv<T>(fn: () => T): T {
  try {
    return fn();
  } catch (err) {
    if (err instanceof CsvRejectedError) throw new AppError("VALIDATION", err.message);
    throw err;
  }
}

async function loadAccount(tx: Tx, accountId: string) {
  if (!z.string().uuid().safeParse(accountId).success) throw new AppError("NOT_FOUND", "Account not found.");
  const [acc] = await tx.select().from(financialAccounts).where(eq(financialAccounts.id, accountId)).limit(1);
  if (!acc) throw new AppError("NOT_FOUND", "Account not found.");
  if (acc.accountClass !== "ledger") throw new AppError("VALIDATION", `${acc.name} is valued manually, so it has no transactions to import.`);
  if (acc.status !== "open") throw new AppError("VALIDATION", `${acc.name} is closed.`);
  return acc;
}

async function instrumentResolver(tx: Tx): Promise<(key: { symbol?: string; isin?: string }) => InstrumentRef | null> {
  // RLS limits this to the global catalogue plus the organisation's private instruments.
  const rows = await tx.select({ id: instruments.id, symbol: instruments.symbol, currency: instruments.currency, name: instruments.name, orgId: instruments.orgId }).from(instruments);
  const ids = rows.map((r) => r.id);
  const isins = ids.length ? await tx.select({ instrumentId: instrumentIdentifiers.instrumentId, value: instrumentIdentifiers.value }).from(instrumentIdentifiers).where(and(eq(instrumentIdentifiers.scheme, "ISIN"), inArray(instrumentIdentifiers.instrumentId, ids))) : [];
  return ({ symbol, isin }) => {
    if (isin) {
      const hit = isins.find((i) => i.value.toUpperCase() === isin.toUpperCase());
      const inst = hit && rows.find((r) => r.id === hit.instrumentId);
      if (inst) return { id: inst.id, currency: inst.currency, name: inst.name };
    }
    if (symbol) {
      const matches = rows.filter((r) => r.symbol?.toUpperCase() === symbol.toUpperCase());
      // Prefer the organisation's own instrument over a catalogue one with the same ticker.
      const inst = matches.find((m) => m.orgId) ?? (matches.length === 1 ? matches[0] : undefined);
      if (inst) return { id: inst.id, currency: inst.currency, name: inst.name };
    }
    return null;
  };
}

/** Parse, map, validate against the current ledger and flag duplicates. Nothing is written to the ledger. */
async function buildRows(tx: Tx, parsed: ParsedCsv, mapping: ImportMapping, account: { id: string; currency: string }): Promise<PreparedRow[]> {
  const resolveInstrument = await instrumentResolver(tx);
  const others = (await tx.select({ id: financialAccounts.id, name: financialAccounts.name, currency: financialAccounts.currency, status: financialAccounts.status }).from(financialAccounts)).filter((a) => a.id !== account.id);
  const resolveAccount = (name: string) => {
    const hits = others.filter((a) => a.name.trim().toLowerCase() === name.trim().toLowerCase());
    return hits.length === 1 ? { id: hits[0]!.id, currency: hits[0]!.currency, name: hits[0]!.name } : null;
  };
  const rows = wrapCsv(() => prepareRows(parsed, mapping, { accountId: account.id, accountCurrency: account.currency, today: new Date().toISOString().slice(0, 10), resolveInstrument, resolveAccount }));
  const existingRows = await loadEvents(tx);
  const reversed = new Set(existingRows.filter((r) => r.reversesEventId).map((r) => r.reversesEventId!));
  const live = existingRows.filter((r) => r.type !== "reversal" && !reversed.has(r.id));
  markDuplicates(rows, live.map((r) => ({ id: r.id, fingerprint: fingerprintOf(r.type, r.occurredOn, r.payload), externalRef: r.externalRef })));

  // Ledger-level dry run of the rows that would be imported.
  const existing = existingRows.map(toEngineEvent);
  const ready = rows.filter((r) => r.status === "ready" && r.input);
  const candidates = ready.map((r) => toEngineEvent({ id: `row-${r.rowNumber}`, type: r.input!.type, occurredOn: r.input!.occurredOn, payload: payloadFromInput(r.input!), reversesEventId: null }));
  const instrumentMap = await loadInstrumentMap(tx, instrumentIdsOf([...existing, ...candidates]));
  const { rejected } = dryRunCandidates(existing, candidates, { baseCurrency: "NGN", instruments: instrumentMap });
  for (const r of ready) {
    const reason = rejected.get(`row-${r.rowNumber}`);
    if (reason) {
      r.status = "error";
      r.errors.push(`This ${reason}`);
    }
  }
  return rows;
}

async function expireStalePreviews(tx: Tx): Promise<void> {
  await tx.update(importBatches).set({ status: "discarded", rawText: null }).where(and(eq(importBatches.status, "previewed"), lt(importBatches.expiresAt, new Date())));
}

async function priorCommit(tx: Tx, sha: string, exceptId?: string) {
  const rows = await tx.select({ id: importBatches.id, fileName: importBatches.fileName, committedAt: importBatches.committedAt }).from(importBatches).where(and(eq(importBatches.fileSha256, sha), eq(importBatches.status, "committed")));
  return rows.find((r) => r.id !== exceptId) ?? null;
}

export interface PreviewRequest {
  accountId: string;
  fileName: string;
  bytes: Uint8Array;
  mappingId?: string;
  dateFormat?: (typeof DATE_FORMATS)[number];
}

export async function previewImport(ctx: TenantContext, req: PreviewRequest): Promise<string> {
  await rateLimit(`import-preview:${ctx.userId}`, 30, 3600);
  const text = wrapCsv(() => decodeCsv(req.bytes));
  const parsed = wrapCsv(() => parseCsv(text));
  const fileName = req.fileName.replace(/[^\w.\- ()]/g, "_").slice(0, 120) || "import.csv";
  const sha = sha256Hex(req.bytes);
  return withTenant(ctx, async (tx) => {
    await enforceLimit(tx, ctx, "csvImportsPerMonth");
    await expireStalePreviews(tx);
    const account = await loadAccount(tx, req.accountId);
    let mapping: ImportMapping = suggestMapping(parsed.headers, req.dateFormat ?? "DD/MM/YYYY");
    if (req.mappingId) {
      const [saved] = await tx.select().from(importMappings).where(eq(importMappings.id, req.mappingId)).limit(1);
      if (!saved) throw new AppError("NOT_FOUND", "Saved mapping not found.");
      mapping = mappingSchema.parse(saved.mapping);
      if (req.dateFormat) mapping.dateFormat = req.dateFormat;
    }
    const rows = mapping.columns.date ? await buildRows(tx, parsed, mapping, account) : [];
    const prior = await priorCommit(tx, sha);
    const [batch] = await tx
      .insert(importBatches)
      .values({
        orgId: ctx.orgId,
        accountId: account.id,
        fileName,
        fileSha256: sha,
        fileSize: req.bytes.byteLength,
        mapping: mapping as unknown as Record<string, unknown>,
        headers: parsed.headers,
        rawText: text,
        rows,
        summary: { ...summarise(rows), ...(prior ? { alreadyImportedBatchId: prior.id, alreadyImportedAt: prior.committedAt?.toISOString() } : {}), ...(mapping.columns.date ? {} : { needsMapping: 1 }) },
        createdBy: ctx.userId,
        expiresAt: new Date(Date.now() + PREVIEW_TTL_HOURS * 3600_000),
      })
      .returning({ id: importBatches.id });
    await recordAudit(tx, { orgId: ctx.orgId, actorUserId: ctx.userId, action: "import.previewed", targetType: "import_batch", targetId: batch!.id, metadata: { rows: rows.length, fileSha256: sha } });
    return batch!.id;
  });
}

async function loadBatch(tx: Tx, batchId: string) {
  if (!z.string().uuid().safeParse(batchId).success) throw new AppError("NOT_FOUND", "Import not found.");
  const [b] = await tx.select().from(importBatches).where(eq(importBatches.id, batchId)).limit(1);
  if (!b) throw new AppError("NOT_FOUND", "Import not found.");
  return b;
}

function assertOpenPreview(b: typeof importBatches.$inferSelect): void {
  if (b.status !== "previewed") throw new AppError("CONFLICT", `This import has already been ${b.status.replace("_", " ")}.`);
  if (b.expiresAt < new Date() || !b.rawText) throw new AppError("CONFLICT", "This preview has expired. Upload the file again.");
}

/** Re-run the preview with a different column/type mapping. */
export async function remapImport(ctx: TenantContext, batchId: string, rawMapping: unknown): Promise<void> {
  const mapping = parseOrThrow(mappingSchema, rawMapping);
  await withTenant(ctx, async (tx) => {
    const b = await loadBatch(tx, batchId);
    assertOpenPreview(b);
    const account = await loadAccount(tx, b.accountId);
    const parsed = wrapCsv(() => parseCsv(b.rawText!));
    const rows = await buildRows(tx, parsed, mapping, account);
    const { needsMapping: _n, ...rest } = b.summary as Record<string, unknown>;
    void _n;
    await tx.update(importBatches).set({ mapping: mapping as unknown as Record<string, unknown>, rows, summary: { ...rest, ...summarise(rows) } }).where(eq(importBatches.id, b.id));
  });
}

/**
 * Post the previewed rows atomically. Rows are re-validated against the ledger as it is now; if
 * anything changed since the preview (new duplicates, or a row the ledger now rejects), nothing is
 * imported and the user is asked to refresh the preview.
 */
export async function commitImport(ctx: TenantContext, batchId: string, opts: { includeDuplicates: boolean }): Promise<{ imported: number }> {
  return withTenant(ctx, async (tx) => {
    await lockLedger(tx, ctx.orgId);
    const b = await loadBatch(tx, batchId);
    assertOpenPreview(b);
    await loadAccount(tx, b.accountId);
    const prior = await priorCommit(tx, b.fileSha256, b.id);
    if (prior) throw new AppError("CONFLICT", `This exact file was already imported (“${prior.fileName}”). Roll that import back first if you want to import it again.`);

    const previewed = b.rows as PreparedRow[];
    const selected = previewed.filter((r) => r.input && (r.status === "ready" || (opts.includeDuplicates && r.status === "duplicate")));
    if (selected.length === 0) throw new AppError("VALIDATION", "There are no rows ready to import.");

    // Has the ledger changed since the preview?
    const existingRows = await loadEvents(tx);
    const reversed = new Set(existingRows.filter((r) => r.reversesEventId).map((r) => r.reversesEventId!));
    const live = existingRows.filter((r) => r.type !== "reversal" && !reversed.has(r.id));
    const recheck = selected.filter((r) => r.status === "ready").map((r) => ({ ...r, warnings: [...r.warnings] }));
    markDuplicates(recheck, live.map((r) => ({ id: r.id, fingerprint: fingerprintOf(r.type, r.occurredOn, r.payload), externalRef: r.externalRef })));
    const newDupes = recheck.filter((r) => r.status === "duplicate").length;
    if (newDupes) throw new AppError("CONFLICT", `Your transactions changed since this preview: ${newDupes} row(s) now match existing entries. Refresh the preview before importing.`);

    const ids = await postEventsInTx(
      tx,
      ctx,
      selected.map((r) => ({ input: { ...r.input!, idempotencyKey: `import:${b.id}:${r.rowNumber}` }, externalRef: r.externalRef, ref: `Row ${r.rowNumber}` })),
      { source: "import", importBatchId: b.id },
    );
    await tx.update(importBatches).set({ status: "committed", rawText: null, committedAt: new Date(), committedBy: ctx.userId, summary: { ...(b.summary as Record<string, unknown>), imported: ids.length, includedDuplicates: opts.includeDuplicates ? selected.filter((r) => r.status === "duplicate").length : 0 } }).where(eq(importBatches.id, b.id));
    await recordAudit(tx, { orgId: ctx.orgId, actorUserId: ctx.userId, action: "import.committed", targetType: "import_batch", targetId: b.id, metadata: { imported: ids.length } });
    return { imported: ids.length };
  });
}

export async function discardImport(ctx: TenantContext, batchId: string): Promise<void> {
  await withTenant(ctx, async (tx) => {
    const b = await loadBatch(tx, batchId);
    if (b.status !== "previewed") throw new AppError("CONFLICT", "Only previews can be discarded.");
    await tx.update(importBatches).set({ status: "discarded", rawText: null }).where(eq(importBatches.id, b.id));
  });
}

/**
 * Undo a committed import by appending reversals for all of its events (the ledger keeps both).
 * Refused if later transactions depend on imported entries (e.g. a sale of imported units).
 */
export async function rollbackImport(ctx: TenantContext, batchId: string, reason: string): Promise<{ reversed: number }> {
  const why = reason.trim();
  if (why.length < 3) throw new AppError("VALIDATION", "Say briefly why you're rolling this import back.", { fieldErrors: { reason: ["Required"] } });
  return withTenant(ctx, async (tx) => {
    await lockLedger(tx, ctx.orgId);
    const b = await loadBatch(tx, batchId);
    if (b.status !== "committed") throw new AppError("CONFLICT", "Only a committed import can be rolled back.");
    const events = await tx.select({ id: ledgerEvents.id }).from(ledgerEvents).where(eq(ledgerEvents.importBatchId, b.id));
    const alreadyReversed = events.length ? await tx.select({ id: ledgerEvents.reversesEventId }).from(ledgerEvents).where(and(isNotNull(ledgerEvents.reversesEventId), inArray(ledgerEvents.reversesEventId, events.map((e) => e.id)))) : [];
    const skip = new Set(alreadyReversed.map((r) => r.id));
    const toReverse = events.map((e) => e.id).filter((id) => !skip.has(id));
    const reversed = toReverse.length ? await reverseEventsInTx(tx, ctx, toReverse, `Import “${b.fileName}” rolled back: ${why}`) : [];
    await tx.update(importBatches).set({ status: "rolled_back", rolledBackAt: new Date(), rolledBackBy: ctx.userId, rollbackReason: why }).where(eq(importBatches.id, b.id));
    await recordAudit(tx, { orgId: ctx.orgId, actorUserId: ctx.userId, action: "import.rolled_back", targetType: "import_batch", targetId: b.id, metadata: { reversed: reversed.length, reason: why } });
    return { reversed: reversed.length };
  });
}

export async function getImport(ctx: TenantContext, batchId: string) {
  return withTenant(ctx, async (tx) => {
    const b = await loadBatch(tx, batchId);
    const [account] = await tx.select({ name: financialAccounts.name, currency: financialAccounts.currency }).from(financialAccounts).where(eq(financialAccounts.id, b.accountId));
    const { rawText: _r, ...rest } = b;
    void _r;
    return { ...rest, rows: b.rows as PreparedRow[], mapping: b.mapping as unknown as ImportMapping, accountName: account?.name ?? "—", expired: b.status === "previewed" && b.expiresAt < new Date() };
  });
}

export async function listImports(ctx: TenantContext) {
  return withTenant(ctx, async (tx) => {
    await expireStalePreviews(tx);
    return tx
      .select({ id: importBatches.id, fileName: importBatches.fileName, status: importBatches.status, summary: importBatches.summary, createdAt: importBatches.createdAt, committedAt: importBatches.committedAt, rolledBackAt: importBatches.rolledBackAt, accountName: financialAccounts.name })
      .from(importBatches)
      .innerJoin(financialAccounts, eq(financialAccounts.id, importBatches.accountId))
      .orderBy(desc(importBatches.createdAt))
      .limit(50);
  });
}

export async function saveMapping(ctx: TenantContext, name: string, rawMapping: unknown): Promise<string> {
  const n = name.trim();
  if (n.length < 2 || n.length > 60) throw new AppError("VALIDATION", "Name the mapping after the institution (2–60 characters).", { fieldErrors: { name: ["2–60 characters"] } });
  const mapping = parseOrThrow(mappingSchema, rawMapping);
  return withTenant(ctx, async (tx) => {
    const [row] = await tx
      .insert(importMappings)
      .values({ orgId: ctx.orgId, name: n, mapping: mapping as unknown as Record<string, unknown>, createdBy: ctx.userId })
      .onConflictDoUpdate({ target: [importMappings.orgId, importMappings.name], set: { mapping: mapping as unknown as Record<string, unknown>, updatedAt: new Date() } })
      .returning({ id: importMappings.id });
    return row!.id;
  });
}

export async function listMappings(ctx: TenantContext) {
  return withTenant(ctx, (tx) => tx.select({ id: importMappings.id, name: importMappings.name }).from(importMappings).orderBy(importMappings.name));
}

