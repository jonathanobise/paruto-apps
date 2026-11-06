import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { fxRates, instrumentIdentifiers, instruments, marketDataImports, marketDataSources, marketPrices, publishedRates } from "@/server/db/schema";
import type { Tx } from "@/server/db/client";
import { asAdmin, type AdminContext } from "./context";
export type { AdminContext };
import { AppError } from "@/server/platform/errors";
import { parseOrThrow } from "@/server/identity/service";
import { recordAudit } from "@/server/audit/audit";
import { ASSET_CLASSES, RATE_METHODOLOGIES, d, isISODate, type RateMethodology } from "@/engine";
import { CsvRejectedError, decodeCsv, parseAmount, parseCsv, parseDate, sha256Hex, type DateFormat } from "@/server/imports/csv";
import { factsSchema } from "@/server/research/facts";

/**
 * Administrator-controlled catalogue and market data. Every function runs as the admin user in
 * context; Postgres re-checks the platform role (app_is_platform_admin()) on every write.
 */
// --- Sources ---------------------------------------------------------------------------------
export const sourceSchema = z.object({
  key: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9-]{1,40}$/, "Lower-case letters, digits and dashes"),
  name: z.string().trim().min(2).max(120),
  kind: z.enum(["official", "licensed", "admin_verified_import"]),
  url: z.string().trim().url().max(300).optional().or(z.literal("").transform(() => undefined)),
  licenseNote: z.string().trim().min(10, "Record the licence or terms that allow this use").max(600),
  defaultFreshnessDays: z.coerce.number().int().min(1).max(400).default(5),
});

export async function listSources(admin: AdminContext) {
  return asAdmin(admin, (tx) => tx.select().from(marketDataSources).orderBy(marketDataSources.name));
}

export async function createSource(admin: AdminContext, input: unknown) {
  const data = parseOrThrow(sourceSchema, input);
  return asAdmin(admin, async (tx) => {
    const [row] = await tx.insert(marketDataSources).values({ ...data, url: data.url ?? null }).onConflictDoNothing().returning({ id: marketDataSources.id });
    if (!row) throw new AppError("CONFLICT", "A source with that key already exists.");
    await recordAudit(tx, { orgId: null, actorUserId: admin.userId, action: "admin.source_created", targetType: "market_data_source", targetId: row.id, metadata: { key: data.key } });
    return row.id;
  });
}

// --- Instruments -------------------------------------------------------------------------------
export const instrumentSchema = z.object({
  name: z.string().trim().min(2).max(160),
  symbol: z.string().trim().toUpperCase().max(24).optional().transform((v) => v || null),
  issuer: z.string().trim().max(160).optional().transform((v) => v || null),
  assetClass: z.enum(ASSET_CLASSES),
  country: z.string().trim().toUpperCase().regex(/^([A-Z]{2}|GLOBAL)$/),
  region: z.string().trim().min(2).max(40),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  pricingModel: z.enum(["market", "nav", "discount_accrual", "manual"]),
  staleAfterDays: z.coerce.number().int().min(1).max(400),
  maturityDate: z.string().optional().transform((v) => v || null).refine((v) => v === null || isISODate(v), "Use a valid date"),
  officialUrl: z.string().trim().url().max(300).optional().or(z.literal("").transform(() => undefined)),
  isin: z.string().trim().toUpperCase().regex(/^[A-Z]{2}[A-Z0-9]{9}\d$/, "12-character ISIN").optional().or(z.literal("").transform(() => undefined)),
  facts: factsSchema,
  factsSourceUrl: z.string().trim().url().max(300).optional().or(z.literal("").transform(() => undefined)),
  factsAsOf: z.string().optional().transform((v) => v || null).refine((v) => v === null || isISODate(v), "Use a valid date"),
  /** Set when the admin confirms identity and facts against the cited official source. */
  verify: z.boolean().default(false),
});

export async function listCatalogue(admin: AdminContext) {
  return asAdmin(admin, (tx) => tx.select().from(instruments).where(isNull(instruments.orgId)).orderBy(instruments.name));
}

export async function getCatalogueInstrument(admin: AdminContext, id: string) {
  return asAdmin(admin, async (tx) => {
    const [row] = await tx.select().from(instruments).where(and(eq(instruments.id, id), isNull(instruments.orgId))).limit(1);
    if (!row) throw new AppError("NOT_FOUND", "Instrument not found.");
    const ids = await tx.select().from(instrumentIdentifiers).where(eq(instrumentIdentifiers.instrumentId, id));
    return { ...row, isin: ids.find((i) => i.scheme === "ISIN")?.value ?? null };
  });
}

/** Create or update a global catalogue instrument. Verification requires a source URL and as-of date. */
export async function saveCatalogueInstrument(admin: AdminContext, id: string | null, input: unknown) {
  const data = parseOrThrow(instrumentSchema, input);
  if (data.pricingModel === "discount_accrual" && !data.maturityDate) throw new AppError("VALIDATION", "Discount instruments need a maturity date.", { fieldErrors: { maturityDate: ["Required"] } });
  if (data.verify && (!data.factsSourceUrl || !data.factsAsOf)) throw new AppError("VALIDATION", "To mark as verified, cite the official source URL and its as-of date.", { fieldErrors: { factsSourceUrl: ["Required to verify"] } });
  return asAdmin(admin, async (tx) => {
    const values = {
      name: data.name,
      symbol: data.symbol,
      issuer: data.issuer,
      assetClass: data.assetClass,
      country: data.country,
      region: data.region,
      currency: data.currency,
      pricingModel: data.pricingModel,
      staleAfterDays: data.staleAfterDays,
      maturityDate: data.maturityDate,
      faceValuePerUnit: data.pricingModel === "discount_accrual" ? "1" : null,
      officialUrl: data.officialUrl ?? null,
      facts: data.facts as Record<string, unknown>,
      factsSourceUrl: data.factsSourceUrl ?? null,
      factsAsOf: data.factsAsOf,
      verificationState: data.verify ? ("verified" as const) : ("unverified" as const),
      verifiedAt: data.verify ? new Date() : null,
      verifiedBy: data.verify ? admin.userId : null,
      updatedAt: new Date(),
    };
    let instrumentId = id;
    if (id) {
      const [row] = await tx.update(instruments).set(values).where(and(eq(instruments.id, id), isNull(instruments.orgId))).returning({ id: instruments.id });
      if (!row) throw new AppError("NOT_FOUND", "Instrument not found.");
    } else {
      const [row] = await tx.insert(instruments).values({ ...values, orgId: null }).returning({ id: instruments.id });
      instrumentId = row!.id;
    }
    if (data.isin) {
      await tx.insert(instrumentIdentifiers).values({ instrumentId: instrumentId!, scheme: "ISIN", value: data.isin, verificationState: data.verify ? "verified" : "unverified" }).onConflictDoNothing();
    }
    await recordAudit(tx, { orgId: null, actorUserId: admin.userId, action: id ? "admin.instrument_updated" : "admin.instrument_created", targetType: "instrument", targetId: instrumentId!, metadata: { verified: data.verify, factsSourceUrl: data.factsSourceUrl ?? null } });
    return instrumentId!;
  });
}

// --- Verified market-data import -----------------------------------------------------------------
export const MARKET_IMPORT_KINDS = {
  prices: { label: "Prices / NAVs", headers: ["symbol", "date", "price", "currency", "methodology"] },
  rates: { label: "Published rates and yields", headers: ["symbol", "as_of", "methodology", "rate_percent", "tenor_days", "basis", "source_url"] },
  fx: { label: "FX rates", headers: ["base", "quote", "date", "rate", "methodology"] },
} as const;
export type MarketImportKind = keyof typeof MARKET_IMPORT_KINDS;

export interface MarketImportRow {
  rowNumber: number;
  status: "ready" | "error";
  errors: string[];
  data: Record<string, string | number | null> | null;
}

function cell(headers: string[], rec: string[], name: string): string {
  const i = headers.findIndex((h) => h.toLowerCase() === name);
  return i < 0 ? "" : (rec[i] ?? "").trim();
}

async function parseMarketRows(tx: Tx, kind: MarketImportKind, text: string, dateFormat: DateFormat): Promise<MarketImportRow[]> {
  const parsed = parseCsv(text);
  const missing = MARKET_IMPORT_KINDS[kind].headers.filter((h) => !["basis", "source_url", "tenor_days", "methodology"].includes(h) && !parsed.headers.some((x) => x.toLowerCase() === h));
  if (missing.length) throw new AppError("VALIDATION", `Missing columns: ${missing.join(", ")}. Expected: ${MARKET_IMPORT_KINDS[kind].headers.join(", ")}.`);
  const catalogue = kind === "fx" ? [] : await tx.select({ id: instruments.id, symbol: instruments.symbol, currency: instruments.currency, isDemo: instruments.isDemo }).from(instruments).where(isNull(instruments.orgId));
  const today = new Date().toISOString().slice(0, 10);
  return parsed.records.map((rec, i) => {
    const errors: string[] = [];
    const get = (n: string) => cell(parsed.headers, rec, n);
    const date = (n: string) => {
      const r = parseDate(get(n), dateFormat);
      if ("error" in r) errors.push(`${n}: ${r.error}`);
      else if (r.value > today) errors.push(`${n}: in the future`);
      return "value" in r ? r.value : null;
    };
    const positive = (n: string) => {
      const r = parseAmount(get(n));
      if ("error" in r) errors.push(`${n}: ${r.error}`);
      else if (d(r.value).lte(0)) errors.push(`${n}: must be positive`);
      return "value" in r ? r.value : null;
    };
    const instrument = () => {
      const sym = get("symbol").toUpperCase();
      const inst = catalogue.find((c) => c.symbol?.toUpperCase() === sym && !c.isDemo);
      if (!inst) errors.push(`symbol: “${sym}” is not a (non-sample) catalogue instrument`);
      return inst ?? null;
    };
    let data: MarketImportRow["data"] = null;
    if (kind === "prices") {
      const inst = instrument();
      const observedOn = date("date");
      const price = positive("price");
      const currency = get("currency").toUpperCase();
      const methodology = (get("methodology") || "close").toLowerCase();
      if (!["close", "nav", "mid", "bid"].includes(methodology)) errors.push("methodology: use close, nav, mid or bid");
      if (inst && currency && currency !== inst.currency) errors.push(`currency: instrument is priced in ${inst.currency}`);
      data = { instrumentId: inst?.id ?? null, symbol: get("symbol").toUpperCase(), observedOn, price, currency: inst?.currency ?? currency, methodology };
    } else if (kind === "rates") {
      const inst = instrument();
      const asOf = date("as_of");
      const methodology = get("methodology").toLowerCase();
      if (!(methodology in RATE_METHODOLOGIES)) errors.push(`methodology: one of ${Object.keys(RATE_METHODOLOGIES).join(", ")}`);
      if (methodology === "expected_return") errors.push("methodology: expected returns are assumptions and are not imported as published data");
      const pctRaw = parseAmount(get("rate_percent"));
      if ("error" in pctRaw) errors.push(`rate_percent: ${pctRaw.error}`);
      else if (d(pctRaw.value).abs().gt(1000)) errors.push("rate_percent: implausible value");
      const tenor = get("tenor_days");
      if (tenor && !/^\d{1,5}$/.test(tenor)) errors.push("tenor_days: whole number of days");
      if (methodology === "discount_rate" && !tenor) errors.push("tenor_days: required for discount rates");
      const url = get("source_url");
      if (url && !/^https:\/\/[^\s]+$/.test(url)) errors.push("source_url: must be an https URL");
      data = { instrumentId: inst?.id ?? null, symbol: get("symbol").toUpperCase(), asOf, methodology, value: "value" in pctRaw ? d(pctRaw.value).div(100).toFixed() : null, tenorDays: tenor ? Number(tenor) : null, basis: get("basis").slice(0, 120) || null, sourceUrl: url || null };
    } else {
      const base = get("base").toUpperCase();
      const quote = get("quote").toUpperCase();
      if (!/^[A-Z]{3}$/.test(base) || !/^[A-Z]{3}$/.test(quote) || base === quote) errors.push("base/quote: two different 3-letter codes");
      const observedOn = date("date");
      const rate = positive("rate");
      const methodology = (get("methodology") || "official").toLowerCase();
      if (!["official", "interbank", "nafem", "parallel", "closing"].includes(methodology)) errors.push("methodology: official, interbank, nafem, parallel or closing");
      data = { base, quote, observedOn, rate, methodology };
    }
    return { rowNumber: i + 2, status: errors.length ? "error" : "ready", errors, data: errors.length ? null : data };
  });
}

export async function previewMarketImport(admin: AdminContext, req: { kind: MarketImportKind; sourceId: string; fileName: string; bytes: Uint8Array; dateFormat: DateFormat }) {
  let text: string;
  try {
    text = decodeCsv(req.bytes);
  } catch (err) {
    if (err instanceof CsvRejectedError) throw new AppError("VALIDATION", err.message);
    throw err;
  }
  return asAdmin(admin, async (tx) => {
    const [source] = await tx.select().from(marketDataSources).where(eq(marketDataSources.id, req.sourceId)).limit(1);
    if (!source || source.kind === "synthetic") throw new AppError("VALIDATION", "Choose an official, licensed or verified-import source.");
    let rows: MarketImportRow[];
    try {
      rows = await parseMarketRows(tx, req.kind, text, req.dateFormat);
    } catch (err) {
      if (err instanceof CsvRejectedError) throw new AppError("VALIDATION", err.message);
      throw err;
    }
    const [row] = await tx
      .insert(marketDataImports)
      .values({ kind: req.kind, sourceId: source.id, fileName: req.fileName.slice(0, 120), fileSha256: sha256Hex(req.bytes), rows, summary: { total: rows.length, ready: rows.filter((r) => r.status === "ready").length, errors: rows.filter((r) => r.status === "error").length }, createdBy: admin.userId })
      .returning({ id: marketDataImports.id });
    await recordAudit(tx, { orgId: null, actorUserId: admin.userId, action: "admin.market_import_previewed", targetType: "market_data_import", targetId: row!.id, metadata: { kind: req.kind, rows: rows.length } });
    return row!.id;
  });
}

export async function getMarketImport(admin: AdminContext, id: string) {
  return asAdmin(admin, async (tx) => {
    const [row] = await tx.select().from(marketDataImports).where(eq(marketDataImports.id, id)).limit(1);
    if (!row) throw new AppError("NOT_FOUND", "Import not found.");
    const [source] = await tx.select().from(marketDataSources).where(eq(marketDataSources.id, row.sourceId));
    return { ...row, rows: row.rows as MarketImportRow[], sourceName: source?.name ?? "—" };
  });
}

export async function listMarketImports(admin: AdminContext) {
  return asAdmin(admin, (tx) => tx.select({ id: marketDataImports.id, kind: marketDataImports.kind, fileName: marketDataImports.fileName, status: marketDataImports.status, summary: marketDataImports.summary, createdAt: marketDataImports.createdAt }).from(marketDataImports).orderBy(desc(marketDataImports.createdAt)).limit(50));
}

/**
 * Commit ready rows. Existing observations for the same instrument/source/date are updated (an
 * admin correction) and logged; the market-data version trigger invalidates analytics caches.
 */
export async function commitMarketImport(admin: AdminContext, id: string): Promise<{ inserted: number }> {
  return asAdmin(admin, async (tx) => {
    const [imp] = await tx.select().from(marketDataImports).where(eq(marketDataImports.id, id)).limit(1);
    if (!imp) throw new AppError("NOT_FOUND", "Import not found.");
    if (imp.status !== "previewed") throw new AppError("CONFLICT", "This import is no longer a preview.");
    const ready = (imp.rows as MarketImportRow[]).filter((r) => r.status === "ready" && r.data);
    if (!ready.length) throw new AppError("VALIDATION", "No rows are ready to import.");
    const verification = "verified" as const;
    for (let i = 0; i < ready.length; i += 500) {
      const chunk = ready.slice(i, i + 500).map((r) => r.data!);
      if (imp.kind === "prices") {
        await tx
          .insert(marketPrices)
          .values(chunk.map((c) => ({ instrumentId: String(c.instrumentId), sourceId: imp.sourceId, observedOn: String(c.observedOn), price: String(c.price), currency: String(c.currency), methodology: String(c.methodology), verificationState: verification })))
          .onConflictDoUpdate({ target: [marketPrices.instrumentId, marketPrices.sourceId, marketPrices.observedOn], set: { price: sql`excluded.price`, methodology: sql`excluded.methodology`, retrievedAt: new Date() } });
      } else if (imp.kind === "rates") {
        await tx
          .insert(publishedRates)
          .values(chunk.map((c) => ({ instrumentId: String(c.instrumentId), methodology: c.methodology as RateMethodology, value: String(c.value), tenorDays: c.tenorDays === null ? null : Number(c.tenorDays), basis: c.basis === null ? null : String(c.basis), asOf: String(c.asOf), sourceId: imp.sourceId, sourceUrl: c.sourceUrl === null ? null : String(c.sourceUrl), verificationState: verification })))
          .onConflictDoUpdate({ target: [publishedRates.instrumentId, publishedRates.methodology, publishedRates.tenorDays, publishedRates.asOf, publishedRates.sourceId], set: { value: sql`excluded.value`, basis: sql`excluded.basis`, sourceUrl: sql`excluded.source_url`, retrievedAt: new Date() } });
      } else {
        await tx
          .insert(fxRates)
          .values(chunk.map((c) => ({ base: String(c.base), quote: String(c.quote), rate: String(c.rate), observedOn: String(c.observedOn), sourceId: imp.sourceId, methodology: String(c.methodology), verificationState: verification })))
          .onConflictDoUpdate({ target: [fxRates.base, fxRates.quote, fxRates.sourceId, fxRates.observedOn], set: { rate: sql`excluded.rate`, retrievedAt: new Date() } });
      }
    }
    await tx.update(marketDataImports).set({ status: "committed", committedBy: admin.userId, committedAt: new Date() }).where(eq(marketDataImports.id, id));
    await recordAudit(tx, { orgId: null, actorUserId: admin.userId, action: "admin.market_import_committed", targetType: "market_data_import", targetId: id, metadata: { kind: imp.kind, rows: ready.length } });
    return { inserted: ready.length };
  });
}

export async function discardMarketImport(admin: AdminContext, id: string) {
  await asAdmin(admin, (tx) => tx.update(marketDataImports).set({ status: "discarded" }).where(and(eq(marketDataImports.id, id), eq(marketDataImports.status, "previewed"))));
}

