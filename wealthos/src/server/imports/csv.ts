/**
 * CSV import: decoding, parsing, mapping and row normalisation. Pure (no I/O) so every rule is
 * unit-tested, including hostile inputs. Database work lives in ./service.ts.
 *
 * Security limits (docs/SECURITY.md): files ≤ 2 MiB, ≤ 5,000 data rows, ≤ 50 columns, cells ≤ 500
 * characters, UTF-8 only, no NUL bytes. Cell text is treated purely as data — nothing is ever
 * evaluated — and exports neutralise spreadsheet formulas.
 */
import Papa from "papaparse";
import { createHash } from "node:crypto";
import { d, isISODate } from "@/engine";
import { eventInputSchema, type EventInput } from "@/server/ledger/codec";

export const LIMITS = { maxBytes: 2 * 1024 * 1024, maxRows: 5000, maxColumns: 50, maxCell: 500 } as const;

export class CsvRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsvRejectedError";
  }
}

// ---------------------------------------------------------------------------------------------
// Decoding and parsing

/** Decode an uploaded file as strict UTF-8 (BOM allowed). Rejects binary and oversized files. */
export function decodeCsv(bytes: Uint8Array): string {
  if (bytes.byteLength === 0) throw new CsvRejectedError("The file is empty.");
  if (bytes.byteLength > LIMITS.maxBytes) throw new CsvRejectedError("The file is larger than 2 MB. Split it into smaller files.");
  if (bytes.includes(0)) throw new CsvRejectedError("This doesn't look like a CSV text file (it contains binary data). Export as CSV and try again.");
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes);
  } catch {
    throw new CsvRejectedError("The file isn't valid UTF-8 text. Re-export it as “CSV UTF-8”.");
  }
  return text.replace(/^﻿/, "");
}

export function sha256Hex(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export interface ParsedCsv {
  headers: string[];
  records: string[][];
  delimiter: string;
}

export function parseCsv(text: string): ParsedCsv {
  const result = Papa.parse<string[]>(text, { header: false, skipEmptyLines: "greedy", delimitersToGuess: [",", ";", "\t", "|"] });
  const fatal = result.errors.find((e) => e.type === "Quotes" || e.type === "Delimiter");
  if (fatal && result.data.length <= 1) throw new CsvRejectedError(`Couldn't read the file as CSV (${fatal.message}).`);
  const [headerRow, ...records] = result.data;
  if (!headerRow) throw new CsvRejectedError("The file has no header row.");
  const headers = headerRow.map((h) => h.trim());
  if (headers.length > LIMITS.maxColumns) throw new CsvRejectedError(`Too many columns (${headers.length}); at most ${LIMITS.maxColumns}.`);
  if (headers.some((h) => h === "")) throw new CsvRejectedError("Every column needs a header name.");
  const lower = headers.map((h) => h.toLowerCase());
  if (new Set(lower).size !== lower.length) throw new CsvRejectedError("Column headers must be unique.");
  if (records.length === 0) throw new CsvRejectedError("The file has a header but no rows.");
  if (records.length > LIMITS.maxRows) throw new CsvRejectedError(`Too many rows (${records.length}); at most ${LIMITS.maxRows} per file.`);
  for (const [i, r] of records.entries()) {
    if (r.some((c) => c.length > LIMITS.maxCell)) throw new CsvRejectedError(`Row ${i + 2} has a cell longer than ${LIMITS.maxCell} characters.`);
  }
  return { headers, records, delimiter: result.meta.delimiter };
}

// ---------------------------------------------------------------------------------------------
// Values

/**
 * Parse a number written the way statements write them: "1,234.56", "₦1,234.56", "(1,234.56)"
 * (negative), "-1234.5", "1 234.56". Decimal point is ".". Rejects ambiguous European formats
 * ("1.234,56"), malformed grouping, exponents and non-finite values rather than guessing.
 */
export function parseAmount(raw: string): { value: string } | { error: string } {
  let s = raw.trim();
  if (s === "") return { error: "is empty" };
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1).trim();
  }
  s = s.replace(/^(NGN|USD|GBP|EUR|N)\s*/i, "").replace(/\s*(NGN|USD|GBP|EUR)$/i, "").replace(/[₦$£€]/g, "").replace(/[\s ]/g, "");
  if (s.startsWith("-")) {
    negative = !negative;
    s = s.slice(1);
  } else if (s.startsWith("+")) s = s.slice(1);
  if (s.endsWith("-")) {
    negative = !negative;
    s = s.slice(0, -1);
  }
  if (!/^(\d{1,3}(,\d{3})+|\d+)(\.\d+)?$/.test(s)) return { error: `“${raw.trim()}” is not a number in the 1,234.56 format` };
  const plain = s.replace(/,/g, "");
  const [int, frac = ""] = plain.split(".");
  if (int!.replace(/^0+/, "").length > 24 || frac.length > 12) return { error: `“${raw.trim()}” has too many digits` };
  const value = d(plain);
  return { value: (negative && !value.isZero() ? value.negated() : value).toFixed() };
}

export const DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD", "auto"] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };

const MONTH_NAMES = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/** Month number for "Jan", "Sept" or "January" (full name or a recognised abbreviation only). */
function monthOf(name: string): number | undefined {
  const n = name.toLowerCase();
  if (MONTHS[n] !== undefined) return MONTHS[n];
  const full = MONTH_NAMES.indexOf(n);
  return full >= 0 ? full + 1 : undefined;
}

function iso(y: number, m: number, dd: number): string | null {
  const s = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  return isISODate(s) ? s : null;
}

/**
 * Parse a date. ISO (2026-01-31, optionally with a time) and month-name forms (31-Jan-2026,
 * 31 Jan 2026, Jan 31, 2026) are unambiguous and always accepted. Numeric day/month forms
 * (31/01/2026) follow the mapping's explicit format — never guessed. Two-digit years are rejected.
 */
export function parseDate(raw: string, format: DateFormat): { value: string } | { error: string } {
  const s = raw.trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ][\d:.]+Z?)?$/.exec(s);
  if (m) {
    const v = iso(+m[1]!, +m[2]!, +m[3]!);
    return v ? { value: v } : { error: `“${s}” is not a real date` };
  }
  m = /^(\d{1,2})[\s\-/]([A-Za-z]{3,9})[\s\-/,]+(\d{4})$/.exec(s);
  if (m) {
    const mon = monthOf(m[2]!);
    if (!mon) return { error: `“${s}” is not a recognised date` };
    const v = iso(+m[3]!, mon, +m[1]!);
    return v ? { value: v } : { error: `“${s}” is not a real date` };
  }
  m = /^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/.exec(s);
  if (m && monthOf(m[1]!)) {
    const v = iso(+m[3]!, monthOf(m[1]!)!, +m[2]!);
    return v ? { value: v } : { error: `“${s}” is not a real date` };
  }
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})(?:\s+[\d:]+)?$/.exec(s);
  if (m) {
    if (m[3]!.length !== 4) return { error: `“${s}” uses a two-digit year; use four digits` };
    if (format === "auto" || format === "YYYY-MM-DD") return { error: `“${s}” could be day/month or month/day — choose the date format for this file` };
    const [a, b, y] = [+m[1]!, +m[2]!, +m[3]!];
    const v = format === "DD/MM/YYYY" ? iso(y, b, a) : iso(y, a, b);
    return v ? { value: v } : { error: `“${s}” is not a real date in ${format}` };
  }
  return { error: `“${s}” is not a recognised date` };
}

// ---------------------------------------------------------------------------------------------
// Mapping

export const IMPORT_FIELDS = {
  date: "Date",
  type: "Transaction type",
  symbol: "Ticker / symbol",
  isin: "ISIN",
  quantity: "Quantity / units",
  price: "Price per unit",
  fees: "Fees / commission",
  amount: "Amount",
  grossAmount: "Gross income",
  withholdingTax: "Withholding tax",
  proceeds: "Proceeds",
  costBasis: "Cost basis",
  acquiredOn: "Acquired on",
  currency: "Currency",
  description: "Description / narration",
  externalRef: "Reference / ID",
  debit: "Debit (money out)",
  credit: "Credit (money in)",
} as const;
export type ImportField = keyof typeof IMPORT_FIELDS;

export const IMPORTABLE_TYPES = ["deposit", "withdrawal", "buy", "sell", "dividend", "interest", "coupon", "fee", "tax", "reinvestment", "maturity", "redemption", "opening_position", "stock_dividend"] as const;
export type ImportableType = (typeof IMPORTABLE_TYPES)[number];

export interface ImportMapping {
  /** field → CSV header (exact, case-insensitive match). */
  columns: Partial<Record<ImportField, string>>;
  dateFormat: DateFormat;
  /** Extra type words used by an institution, lower-case → ledger type. */
  typeAliases: Record<string, ImportableType>;
}

const BUILTIN_TYPE_ALIASES: Record<string, ImportableType> = {
  deposit: "deposit", credit: "deposit", cr: "deposit", lodgement: "deposit", lodgment: "deposit", "cash in": "deposit", "money in": "deposit", contribution: "deposit", inflow: "deposit",
  withdrawal: "withdrawal", withdraw: "withdrawal", debit: "withdrawal", dr: "withdrawal", "cash out": "withdrawal", "money out": "withdrawal", outflow: "withdrawal",
  buy: "buy", b: "buy", purchase: "buy", bought: "buy", subscription: "buy", subscribe: "buy",
  sell: "sell", s: "sell", sale: "sell", sold: "sell",
  dividend: "dividend", div: "dividend", "cash dividend": "dividend",
  interest: "interest", int: "interest", "interest income": "interest",
  coupon: "coupon", "coupon payment": "coupon",
  fee: "fee", fees: "fee", charge: "fee", charges: "fee", commission: "fee", "management fee": "fee", "custody fee": "fee",
  tax: "tax", wht: "tax", "withholding tax": "tax",
  reinvestment: "reinvestment", reinvest: "reinvestment", drip: "reinvestment", "dividend reinvestment": "reinvestment",
  maturity: "maturity", matured: "maturity",
  redemption: "redemption", redeem: "redemption", liquidation: "redemption",
  "opening position": "opening_position", "opening balance": "opening_position", opening_position: "opening_position", transfer_in: "opening_position",
  bonus: "stock_dividend", "bonus issue": "stock_dividend", "stock dividend": "stock_dividend", stock_dividend: "stock_dividend", scrip: "stock_dividend",
};

const HEADER_ALIASES: Record<ImportField, string[]> = {
  date: ["date", "trade date", "transaction date", "value date", "posting date", "txn date", "settlement date", "trans date"],
  type: ["type", "transaction type", "txn type", "action", "activity", "trans type"],
  symbol: ["symbol", "ticker", "stock", "security", "stock code", "instrument", "code"],
  isin: ["isin"],
  quantity: ["quantity", "qty", "units", "shares", "volume", "no of units", "number of units", "face value"],
  price: ["price", "unit price", "price per unit", "rate", "nav", "trade price"],
  fees: ["fees", "fee", "commission", "charges", "brokerage", "total charges"],
  amount: ["amount", "value", "consideration", "net amount", "transaction amount"],
  grossAmount: ["gross amount", "gross", "gross dividend", "gross income"],
  withholdingTax: ["withholding tax", "wht", "tax withheld", "tax"],
  proceeds: ["proceeds", "redemption amount", "maturity value"],
  costBasis: ["cost basis", "cost", "book cost", "total cost"],
  acquiredOn: ["acquired on", "acquisition date", "purchase date"],
  currency: ["currency", "ccy", "curr"],
  description: ["description", "narration", "details", "remarks", "memo", "narrative", "particulars"],
  externalRef: ["reference", "ref", "transaction id", "txn id", "id", "reference number", "ref no", "contract note", "contract no"],
  debit: ["debit", "withdrawals", "money out", "dr", "debit amount", "paid out"],
  credit: ["credit", "deposits", "lodgements", "money in", "cr", "credit amount", "paid in"],
};

/** Suggest a mapping from headers (case/space-insensitive aliases). Each header is used once. */
export function suggestMapping(headers: string[], dateFormat: DateFormat = "DD/MM/YYYY"): ImportMapping {
  const norm = (h: string) => h.toLowerCase().replace(/[_\s]+/g, " ").trim();
  const used = new Set<string>();
  const columns: Partial<Record<ImportField, string>> = {};
  for (const field of Object.keys(HEADER_ALIASES) as ImportField[]) {
    for (const alias of HEADER_ALIASES[field]) {
      const hit = headers.find((h) => norm(h) === alias && !used.has(h));
      if (hit) {
        columns[field] = hit;
        used.add(hit);
        break;
      }
    }
  }
  // "Tax" alone is withholding tax only when there's an income column; never both tax and debit for one header.
  return { columns, dateFormat, typeAliases: {} };
}

export const WEALTHOS_TEMPLATE_HEADERS = ["date", "type", "symbol", "quantity", "price", "fees", "amount", "gross_amount", "withholding_tax", "currency", "description", "reference"];

export function resolveType(raw: string, mapping: ImportMapping): ImportableType | null {
  const key = raw.trim().toLowerCase().replace(/[_\s]+/g, " ");
  const custom = Object.entries(mapping.typeAliases).find(([k]) => k.toLowerCase().replace(/[_\s]+/g, " ") === key)?.[1];
  return custom ?? BUILTIN_TYPE_ALIASES[key] ?? BUILTIN_TYPE_ALIASES[key.replace(/ /g, "_")] ?? null;
}

// ---------------------------------------------------------------------------------------------
// Rows

export interface InstrumentRef {
  id: string;
  currency: string;
  name: string;
}

export interface RowContext {
  accountId: string;
  accountCurrency: string;
  today: string;
  /** Look up a visible instrument by ticker or ISIN (case-insensitive). */
  resolveInstrument: (key: { symbol?: string; isin?: string }) => InstrumentRef | null;
}

export type RowStatus = "ready" | "error" | "duplicate";

export interface PreparedRow {
  /** Spreadsheet row number (header = 1). */
  rowNumber: number;
  status: RowStatus;
  errors: string[];
  warnings: string[];
  /** Raw cells for the mapped columns, for display. */
  cells: Record<string, string>;
  input: EventInput | null;
  externalRef: string | null;
  fingerprint: string | null;
  duplicateOf?: string;
}

const NEEDS_INSTRUMENT: ImportableType[] = ["buy", "sell", "reinvestment", "maturity", "redemption", "opening_position", "stock_dividend"];

export function prepareRows(parsed: ParsedCsv, mapping: ImportMapping, ctx: RowContext): PreparedRow[] {
  const index = new Map(parsed.headers.map((h, i) => [h.toLowerCase(), i]));
  const col = (rec: string[], f: ImportField): string => {
    const header = mapping.columns[f];
    if (!header) return "";
    const i = index.get(header.toLowerCase());
    return i === undefined ? "" : (rec[i] ?? "").trim();
  };
  const missingHeaders = Object.entries(mapping.columns).filter(([, h]) => h && !index.has(h.toLowerCase())).map(([f, h]) => `${IMPORT_FIELDS[f as ImportField]} → “${h}”`);
  if (!mapping.columns.date) throw new CsvRejectedError("Map a Date column before previewing.");
  if (missingHeaders.length) throw new CsvRejectedError(`These mapped columns aren't in the file: ${missingHeaders.join(", ")}.`);

  return parsed.records.map((rec, i) => {
    const rowNumber = i + 2;
    const errors: string[] = [];
    const warnings: string[] = [];
    const cells: Record<string, string> = {};
    for (const f of Object.keys(mapping.columns) as ImportField[]) {
      const v = col(rec, f);
      if (v) cells[f] = v;
    }
    const num = (f: ImportField, opts: { required?: boolean; abs?: boolean } = {}): string | undefined => {
      const raw = col(rec, f);
      if (!raw) {
        if (opts.required) errors.push(`${IMPORT_FIELDS[f]} is missing`);
        return undefined;
      }
      const r = parseAmount(raw);
      if ("error" in r) {
        errors.push(`${IMPORT_FIELDS[f]} ${r.error}`);
        return undefined;
      }
      return opts.abs === false ? r.value : r.value.replace(/^-/, "");
    };

    // Date
    const rawDate = col(rec, "date");
    let date: string | undefined;
    if (!rawDate) errors.push("Date is missing");
    else {
      const r = parseDate(rawDate, mapping.dateFormat);
      if ("error" in r) errors.push(`Date ${r.error}`);
      else if (r.value > ctx.today) errors.push(`Date ${r.value} is in the future`);
      else date = r.value;
    }

    // Type (explicit, or inferred from debit/credit or a signed amount)
    let type: ImportableType | null = null;
    let signedAmount: string | undefined;
    const rawType = col(rec, "type");
    if (rawType) {
      type = resolveType(rawType, mapping);
      if (!type) errors.push(`Type “${rawType}” isn't recognised — map it to a transaction type`);
    } else if (mapping.columns.debit || mapping.columns.credit) {
      const debit = col(rec, "debit") ? num("debit") : undefined;
      const credit = col(rec, "credit") ? num("credit") : undefined;
      const dPos = debit !== undefined && d(debit).gt(0);
      const cPos = credit !== undefined && d(credit).gt(0);
      if (dPos && cPos) errors.push("Row has both a debit and a credit");
      else if (cPos) [type, signedAmount] = ["deposit", credit];
      else if (dPos) [type, signedAmount] = ["withdrawal", debit];
      else if (!errors.length) errors.push("Row has neither a debit nor a credit");
    } else if (mapping.columns.amount) {
      const a = num("amount", { required: true, abs: false });
      if (a !== undefined) {
        if (d(a).isZero()) errors.push("Amount is zero");
        else [type, signedAmount] = d(a).isNegative() ? ["withdrawal", a.slice(1)] : ["deposit", a];
      }
    } else errors.push("Map a Type column, Debit/Credit columns, or a signed Amount column");

    // Instrument
    let instrument: InstrumentRef | null = null;
    const symbol = col(rec, "symbol");
    const isin = col(rec, "isin");
    if (symbol || isin) {
      instrument = ctx.resolveInstrument({ ...(symbol ? { symbol } : {}), ...(isin ? { isin } : {}) });
      if (!instrument) errors.push(`Instrument “${symbol || isin}” isn't in your catalogue — add it as a private instrument first`);
    } else if (type && NEEDS_INSTRUMENT.includes(type)) errors.push("Ticker / symbol is missing");

    const currencyRaw = col(rec, "currency").toUpperCase();
    if (currencyRaw && !/^[A-Z]{3}$/.test(currencyRaw)) errors.push(`Currency “${currencyRaw}” isn't a 3-letter code`);
    const currency = currencyRaw || instrument?.currency || ctx.accountCurrency;
    const description = col(rec, "description") || undefined;
    const externalRef = col(rec, "externalRef") || null;

    let input: Record<string, unknown> | null = null;
    if (type && date && !errors.length) {
      const base = { type, occurredOn: date, ...(description ? { description: description.slice(0, 300) } : {}) };
      const acc = { accountId: ctx.accountId };
      switch (type) {
        case "deposit":
        case "withdrawal":
        case "fee":
        case "tax": {
          const amount = signedAmount ?? num("amount", { required: true });
          if (amount) input = { ...base, ...acc, currency, amount, ...(instrument && (type === "fee" || type === "tax") ? { instrumentId: instrument.id } : {}) };
          break;
        }
        case "buy":
        case "sell": {
          const quantity = num("quantity", { required: true });
          const fees = num("fees") ?? "0";
          let price = num("price");
          if (!price && quantity) {
            const amount = num("amount");
            if (amount && d(quantity).gt(0)) {
              price = d(amount).div(quantity).toDecimalPlaces(12).toFixed();
              warnings.push("Price derived from Amount ÷ Quantity (Amount taken as the value before fees) — check it");
            } else errors.push("Price per unit is missing");
          }
          if (quantity && price) input = { ...base, ...acc, instrumentId: instrument!.id, quantity, price, fees, currency };
          break;
        }
        case "dividend":
        case "interest":
        case "coupon": {
          const gross = num("grossAmount") ?? num("amount", { required: true });
          const wht = num("withholdingTax") ?? "0";
          if (!col(rec, "withholdingTax") && type === "dividend") warnings.push("No withholding tax column — the amount is treated as gross with no tax deducted");
          if (gross) input = { ...base, ...acc, currency, grossAmount: gross, withholdingTax: wht, ...(instrument ? { instrumentId: instrument.id } : {}) };
          break;
        }
        case "reinvestment": {
          const amount = num("amount", { required: true });
          const quantity = num("quantity", { required: true });
          if (amount && quantity) input = { ...base, ...acc, instrumentId: instrument!.id, currency, amount, quantity };
          break;
        }
        case "maturity":
        case "redemption": {
          const quantity = num("quantity", { required: true });
          const proceeds = num("proceeds") ?? num("amount", { required: true });
          if (quantity && proceeds) input = { ...base, ...acc, instrumentId: instrument!.id, currency, quantity, proceeds };
          break;
        }
        case "opening_position": {
          const quantity = num("quantity", { required: true });
          const costBasis = num("costBasis") ?? num("amount", { required: true });
          let acquiredOn = date;
          const rawAcq = col(rec, "acquiredOn");
          if (rawAcq) {
            const r = parseDate(rawAcq, mapping.dateFormat);
            if ("error" in r) errors.push(`Acquired on ${r.error}`);
            else acquiredOn = r.value;
          }
          if (quantity && costBasis) input = { ...base, ...acc, instrumentId: instrument!.id, currency, quantity, costBasis, acquiredOn };
          break;
        }
        case "stock_dividend": {
          const quantity = num("quantity", { required: true });
          if (quantity) input = { ...base, ...acc, instrumentId: instrument!.id, quantity };
          break;
        }
      }
    }

    let parsedInput: EventInput | null = null;
    if (input && !errors.length) {
      const r = eventInputSchema.safeParse(input);
      if (r.success) parsedInput = r.data;
      else errors.push(...r.error.issues.map((iss) => `${String(iss.path[0] ?? "Row")}: ${iss.message}`));
    }
    if (parsedInput && instrument && "currency" in parsedInput && ["buy", "sell", "reinvestment", "maturity", "redemption", "opening_position"].includes(parsedInput.type) && parsedInput.currency !== instrument.currency) {
      errors.push(`${instrument.name} trades in ${instrument.currency} but the row is in ${parsedInput.currency}`);
      parsedInput = null;
    }
    if (description && /^[=+\-@]/.test(description) && !/^[-+]?\d/.test(description)) warnings.push("Description starts with a formula character; it is stored as plain text and neutralised in exports");

    return {
      rowNumber,
      status: errors.length || !parsedInput ? "error" : "ready",
      errors: errors.length || parsedInput ? errors : ["Row couldn't be interpreted"],
      warnings,
      cells,
      input: errors.length ? null : parsedInput,
      externalRef,
      fingerprint: parsedInput && !errors.length ? fingerprintOf(parsedInput.type, parsedInput.occurredOn, parsedInput as unknown as Record<string, unknown>) : null,
    };
  });
}

// ---------------------------------------------------------------------------------------------
// Duplicates

const FP_FIELDS = ["accountId", "instrumentId", "amount", "quantity", "price", "grossAmount", "proceeds", "costBasis", "currency"] as const;

/** Content fingerprint of a ledger event (type, date, account, instrument and key figures). */
export function fingerprintOf(type: string, date: string, payload: Record<string, unknown>): string {
  const parts = [type, date];
  for (const f of FP_FIELDS) {
    const v = payload[f];
    if (v === undefined || v === null || v === "") parts.push("");
    else if (typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v)) parts.push(d(v).toFixed());
    else parts.push(String(v));
  }
  return parts.join("|");
}

export interface ExistingEventKey {
  id: string;
  fingerprint: string;
  externalRef: string | null;
}

/**
 * Flag rows that already exist in the ledger. Matching is by external reference when both sides
 * have one, otherwise by content fingerprint, counted as a multiset (two identical rows match two
 * identical ledger events, not one). Identical rows within the file are kept but warned about.
 */
export function markDuplicates(rows: PreparedRow[], existing: ExistingEventKey[]): void {
  const byRef = new Map(existing.filter((e) => e.externalRef).map((e) => [e.externalRef!, e.id]));
  const pool = new Map<string, string[]>();
  for (const e of existing) pool.set(e.fingerprint, [...(pool.get(e.fingerprint) ?? []), e.id]);
  const seenInFile = new Map<string, number>();
  for (const row of rows) {
    if (row.status !== "ready" || !row.fingerprint) continue;
    if (row.externalRef && byRef.has(row.externalRef)) {
      row.status = "duplicate";
      row.duplicateOf = byRef.get(row.externalRef)!;
      continue;
    }
    if (row.externalRef) continue; // a new reference is not a duplicate even if the figures match
    const ids = pool.get(row.fingerprint);
    if (ids?.length) {
      row.status = "duplicate";
      row.duplicateOf = ids.shift()!;
      continue;
    }
    const n = (seenInFile.get(row.fingerprint) ?? 0) + 1;
    seenInFile.set(row.fingerprint, n);
    if (n > 1) row.warnings.push("Same date, type and figures as an earlier row in this file — check it isn't repeated");
  }
}

export function summarise(rows: PreparedRow[]): Record<string, number> {
  return {
    total: rows.length,
    ready: rows.filter((r) => r.status === "ready").length,
    errors: rows.filter((r) => r.status === "error").length,
    duplicates: rows.filter((r) => r.status === "duplicate").length,
    warnings: rows.filter((r) => r.warnings.length > 0).length,
  };
}
