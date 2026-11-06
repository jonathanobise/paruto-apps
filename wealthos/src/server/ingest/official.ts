/**
 * Parsers for official public data sources (pure functions: text/JSON in, normalised rows out).
 * Fetching and storing live in scripts/ingest.ts so these stay testable on saved samples.
 *
 * Sources (terms and attribution: docs/DATA_SOURCES.md):
 * - Central Bank of Nigeria (cbn.gov.ng/api): official exchange rates, inflation (year on year),
 *   money-market indicators, primary auction results for NTBs and FGN bonds.
 * - Federal Reserve Board (H.15): effective federal funds rate.
 * - Bank of England database: Bank Rate.
 * - Office for National Statistics: CPI index (D7BT), Open Government Licence.
 *
 * Rules: values are kept as published decimal strings (percentages converted to fractions by exact
 * decimal shift); unparseable or ambiguous rows are counted and skipped, never guessed.
 */
import { d, type ISODate } from "@/engine";

export interface ParseReport<T> {
  rows: T[];
  skipped: number;
  notes: string[];
}

const MONTHS: Record<string, number> = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };

/** Last calendar day of a month as an ISO date. */
export function monthEndOf(year: number, month: number): ISODate {
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

/** "12.34" (percent) → "0.1234", exactly. Empty, non-numeric → null. */
export function pctToFraction(v: unknown): string | null {
  const s = String(v ?? "").trim().replace(/%$/, "");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  return d(s).div(100).toString();
}

function decimalOrNull(v: unknown): string | null {
  const s = String(v ?? "").trim().replace(/,/g, "");
  return /^-?\d+(\.\d+)?$/.test(s) ? d(s).toString() : null;
}

// ---------------------------------------------------------------- CBN exchange rates

/** CBN currency labels (with their historical spelling variants) → ISO 4217. */
const CBN_CURRENCIES: Record<string, string> = {
  "US DOLLAR": "USD", "POUND STERLING": "GBP", "POUNDS STERLING": "GBP", EURO: "EUR", YEN: "JPY", "JAPANESE YEN": "JPY",
  "SWISS FRANC": "CHF", "YUAN/RENMINBI": "CNY", "SOUTH AFRICAN RAND": "ZAR", "DANISH KRONA": "DKK", "DANISH KRONER": "DKK",
  RIYAL: "SAR", "UAE DIRHAM": "AED", CFA: "XOF", SDR: "XDR",
};

export interface CbnFxRow { base: string; quote: "NGN"; date: ISODate; rate: string }

/** /api/GetAllExchangeRates → official central rates, naira per unit of each currency. */
export function parseCbnExchangeRates(json: unknown): ParseReport<CbnFxRow> {
  const out = new Map<string, CbnFxRow>();
  let skipped = 0;
  const conflicts: string[] = [];
  for (const r of Array.isArray(json) ? (json as Array<Record<string, unknown>>) : []) {
    const iso = CBN_CURRENCIES[String(r.currency ?? "").replace(/\s+/g, " ").trim().toUpperCase()];
    const date = String(r.ratedate ?? "");
    const rate = decimalOrNull(r.centralrate);
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !rate || d(rate).lte(0)) {
      skipped++;
      continue;
    }
    const k = `${iso}|${date}`;
    const prev = out.get(k);
    if (prev && prev.rate !== rate) {
      // Two different published values for the same currency and day: keep neither.
      conflicts.push(k);
      continue;
    }
    out.set(k, { base: iso, quote: "NGN", date, rate });
  }
  for (const k of conflicts) out.delete(k);
  return { rows: [...out.values()], skipped: skipped + conflicts.length, notes: conflicts.length ? [`${conflicts.length} currency-days had conflicting values and were left out`] : [] };
}

// ---------------------------------------------------------------- CBN monthly series

export interface MonthlyObs { seriesKey: string; date: ISODate; value: string }

/** /api/GetAllInflationRates → year-on-year inflation (fractions) for headline, food and core. */
export function parseCbnInflation(json: unknown): ParseReport<MonthlyObs> {
  const rows: MonthlyObs[] = [];
  let skipped = 0;
  const map: Array<[string, string]> = [["NG.CPI_YOY", "allItemsYearOn"], ["NG.FOOD_YOY", "foodYearOn"], ["NG.CORE_YOY", "allItemsLessFrmProdAndEnergyYearOn"]];
  for (const r of Array.isArray(json) ? (json as Array<Record<string, unknown>>) : []) {
    const y = Number(r.tyear);
    const m = Number(r.tmonth);
    if (!Number.isInteger(y) || m < 1 || m > 12) {
      skipped++;
      continue;
    }
    for (const [key, field] of map) {
      const v = pctToFraction(r[field]);
      if (v === null) skipped++;
      else rows.push({ seriesKey: key, date: monthEndOf(y, m), value: v });
    }
  }
  return { rows, skipped, notes: [] };
}

/** /api/GetAllMoneyMarketIndicators → monthly policy, interbank, T-bill, deposit and lending rates. */
export function parseCbnMoneyMarket(json: unknown): ParseReport<MonthlyObs> {
  const rows: MonthlyObs[] = [];
  let skipped = 0;
  const map: Array<[string, string, boolean]> = [
    ["NG.MPR", "mpr", true], ["NG.INTERBANK_CALL", "interBankCallRate", false], ["NG.TBILL_RATE", "treasuryBill", false],
    ["NG.SAVINGS_DEPOSIT", "savingsDeposit", false], ["NG.DEPOSIT_12M", "twelveMonthsDeposit", false], ["NG.PRIME_LENDING", "primeLending", false], ["NG.MAX_LENDING", "maxLending", false],
  ];
  for (const r of Array.isArray(json) ? (json as Array<Record<string, unknown>>) : []) {
    const y = Number(r.tyear);
    const m = Number(r.tmonth);
    if (!Number.isInteger(y) || m < 1 || m > 12) {
      skipped++;
      continue;
    }
    for (const [key, field, zeroMeansMissing] of map) {
      const v = pctToFraction(r[field]);
      // The MPR did not exist before December 2006; the API reports 0.00 for those months.
      if (v === null || (zeroMeansMissing && d(v).isZero())) skipped++;
      else rows.push({ seriesKey: key, date: monthEndOf(y, m), value: v });
    }
  }
  return { rows, skipped, notes: [] };
}

// ---------------------------------------------------------------- CBN primary auctions

export interface AuctionResult {
  security: "NTB" | "FGN_BOND";
  auctionDate: ISODate;
  maturityDate: ISODate;
  /** Tenor in days (NTB) — from the stated tenor, else from the dates. */
  tenorDays: number;
  tenorLabel: string;
  /** Stop/marginal rate as a fraction: a discount rate for NTBs, a yield for FGN bonds. */
  rate: string;
  offered: string | null;
  sold: string | null;
  subscribed: string | null;
}

/** "November-04-2026" → "2026-11-04". */
export function parseCbnDate(v: unknown): ISODate | null {
  const m = /^([A-Za-z]+)-(\d{1,2})-(\d{4})$/.exec(String(v ?? "").trim());
  if (!m) return null;
  const month = MONTHS[m[1]!.toLowerCase()];
  if (!month) return null;
  return `${m[3]}-${String(month).padStart(2, "0")}-${m[2]!.padStart(2, "0")}`;
}

/** /api/GetAllSecuritiesNTB and /api/GetAllSecuritiesFGNBond → primary-market auction results only. */
export function parseCbnAuctions(json: unknown, security: "NTB" | "FGN_BOND"): ParseReport<AuctionResult> {
  const rows: AuctionResult[] = [];
  let skipped = 0;
  for (const r of Array.isArray(json) ? (json as Array<Record<string, unknown>>) : []) {
    if (String(r.auction ?? "").trim() !== "Primary Market") {
      skipped++;
      continue;
    }
    const auctionDate = parseCbnDate(r.auctionDate);
    const maturityDate = parseCbnDate(r.maturityDate);
    const rate = pctToFraction(r.rate);
    if (!auctionDate || !maturityDate || !rate || d(rate).lte(0) || maturityDate <= auctionDate) {
      skipped++;
      continue;
    }
    const label = String(r.tenor ?? "").trim();
    const stated = /^(\d+)\s*DAY/i.exec(label) ?? /^(\d+)$/.exec(label);
    const byDates = Math.round((Date.parse(maturityDate) - Date.parse(auctionDate)) / 86400000);
    rows.push({
      security,
      auctionDate,
      maturityDate,
      tenorDays: security === "NTB" && stated ? Number(stated[1]) : byDates,
      tenorLabel: label,
      rate,
      offered: decimalOrNull(r.amtOffered),
      sold: decimalOrNull(r.totalSuccessful),
      subscribed: decimalOrNull(r.totalSubscription),
    });
  }
  return { rows, skipped, notes: [] };
}

// ---------------------------------------------------------------- US / UK

export interface DailyObs { seriesKey: string; date: ISODate; value: string }

/** Federal Reserve Data Download Program CSV (H.15, one series per column). */
export function parseFedH15Csv(text: string, seriesKey: string): ParseReport<DailyObs> {
  const rows: DailyObs[] = [];
  let skipped = 0;
  for (const line of text.split(/\r?\n/)) {
    const m = /^(\d{4}-\d{2}-\d{2}),(.*)$/.exec(line.trim());
    if (!m) continue;
    const v = pctToFraction(m[2]);
    if (v === null) skipped++; // "ND" (no data) on holidays
    else rows.push({ seriesKey, date: m[1]!, value: v });
  }
  return { rows, skipped, notes: [] };
}

/** Bank of England database CSV ("DATE,IUDBEDR" / "02 Jan 2014,0.5"). Keeps only changes. */
export function parseBoeCsv(text: string, seriesKey: string): ParseReport<DailyObs> {
  const rows: DailyObs[] = [];
  let skipped = 0;
  const mon: Record<string, string> = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };
  let last: string | null = null;
  for (const line of text.split(/\r?\n/)) {
    const m = /^(\d{2}) ([A-Z][a-z]{2}) (\d{4}),(.*)$/.exec(line.trim());
    if (!m) continue;
    const v = pctToFraction(m[4]);
    if (v === null || !mon[m[2]!]) {
      skipped++;
      continue;
    }
    if (v === last) continue;
    last = v;
    rows.push({ seriesKey, date: `${m[3]}-${mon[m[2]!]}-${m[1]}`, value: v });
  }
  return { rows, skipped, notes: [] };
}

/** ONS time-series CSV ("2015 JAN","99.3"): monthly rows only, dated to the month end. */
export function parseOnsMonthlyCsv(text: string, seriesKey: string): ParseReport<MonthlyObs> {
  const rows: MonthlyObs[] = [];
  let skipped = 0;
  const mon: Record<string, number> = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };
  for (const line of text.split(/\r?\n/)) {
    const m = /^"(\d{4}) ([A-Z]{3})","([^"]*)"$/.exec(line.trim());
    if (!m) continue;
    const v = decimalOrNull(m[3]);
    if (v === null || !mon[m[2]!]) skipped++;
    else rows.push({ seriesKey, date: monthEndOf(Number(m[1]), mon[m[2]!]!), value: v });
  }
  return { rows, skipped, notes: [] };
}
