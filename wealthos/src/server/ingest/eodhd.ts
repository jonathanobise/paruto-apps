/**
 * EODHD (eodhd.com) adapter: end-of-day prices, dividends, splits and company fundamentals for US,
 * UK (LSE), global ETFs and the Nigerian Exchange (XNSA).
 *
 * Licence: the owner's EODHD subscription. Personal plans are for the subscriber's own use and
 * forbid displaying the data to others (docs/DATA_SOURCES.md) — fine for the private research
 * instance, NOT for the public demo or a public launch without a display licence.
 *
 * We store RAW closes and the dividend/split record, and compute total returns ourselves, so
 * every figure is reproducible from stored observations. Analyst ratings, price targets and
 * estimates are deliberately not ingested: they are third-party opinions/forecasts.
 */
import { d, type ISODate } from "@/engine";

export const EODHD_BASE = "https://eodhd.com/api";

/** API calls each endpoint costs against the daily allowance (EODHD's published weighting). */
export const EODHD_CALL_COST = { eod: 1, div: 1, splits: 1, fundamentals: 10, symbols: 1 } as const;

/** A day's raw prices. open/high/low/volume are null when missing or inconsistent (the close is kept). */
export interface EodPrice { date: ISODate; close: string; open: string | null; high: string | null; low: string | null; volume: string | null }
export interface EodDividend { exDate: ISODate; payDate: ISODate | null; amount: string; currency: string }
export interface EodSplit { exDate: ISODate; ratio: string }

const isDate = (v: unknown): v is ISODate => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const num = (v: unknown): string | null => {
  if (typeof v === "number" && Number.isFinite(v)) return d(v).toString();
  if (typeof v === "string" && /^-?\d+(\.\d+)?(e[+-]?\d+)?$/i.test(v.trim())) return d(v.trim()).toString();
  return null;
};

/** LSE prices and dividends come in pence (GBX); store pounds. */
export function normaliseCurrency(value: string, currency: string): { value: string; currency: string } {
  const c = currency.toUpperCase();
  if (c === "GBX" || c === "GBP_PENCE" || currency === "GBp") return { value: d(value).div(100).toString(), currency: "GBP" };
  return { value, currency: c };
}

/**
 * The day's open, high and low (normalised like the close) and volume, only when they make a
 * coherent bar: all positive, high the highest and low the lowest of the four. A bar that doesn't
 * (sources occasionally publish one) is left out rather than corrected; the close still counts.
 */
function bar(r: Record<string, unknown>, close: string, currency: string): Pick<EodPrice, "open" | "high" | "low" | "volume"> {
  const o = num(r.open);
  const h = num(r.high);
  const l = num(r.low);
  const v = num(r.volume);
  const volume = v !== null && d(v).gte(0) ? d(v).toString() : null;
  if (o === null || h === null || l === null) return { open: null, high: null, low: null, volume };
  const [O, H, L, C] = [d(o), d(h), d(l), d(close)];
  const coherent = O.gt(0) && L.gt(0) && H.gte(O) && H.gte(C) && H.gte(L) && L.lte(O) && L.lte(C);
  if (!coherent) return { open: null, high: null, low: null, volume };
  return { open: normaliseCurrency(o, currency).value, high: normaliseCurrency(h, currency).value, low: normaliseCurrency(l, currency).value, volume };
}

export function parseEod(json: unknown, currency: string): { rows: EodPrice[]; currency: string; skipped: number } {
  const rows: EodPrice[] = [];
  let skipped = 0;
  let outCcy = currency.toUpperCase();
  for (const r of Array.isArray(json) ? (json as Array<Record<string, unknown>>) : []) {
    const close = num(r.close);
    if (!isDate(r.date) || close === null || d(close).lte(0)) {
      skipped++;
      continue;
    }
    const n = normaliseCurrency(close, currency);
    outCcy = n.currency;
    rows.push({ date: r.date, close: n.value, ...bar(r, close, currency) });
  }
  return { rows, currency: outCcy, skipped };
}

/**
 * Government bond yields EODHD publishes as end-of-day series (exchange GBOND), with the macro
 * series each is stored as. Nigeria has only the 10-year; the US and UK 10-year give context.
 */
export const GBOND_SERIES = [
  { code: "NG10Y.GBOND", key: "NG.GB10Y" },
  { code: "US10Y.GBOND", key: "US.GB10Y" },
  { code: "UK10Y.GBOND", key: "UK.GB10Y" },
] as const;

/**
 * EOD rows of a GBOND yield series (the close is the yield in percent, e.g. 16.42) → decimal
 * fractions ("0.1642"). A yield outside −5%…60% is a bad print and is skipped, never corrected.
 */
export function parseBondYields(json: unknown, seriesKey: string): { rows: Array<{ seriesKey: string; date: ISODate; value: string }>; skipped: number } {
  const rows: Array<{ seriesKey: string; date: ISODate; value: string }> = [];
  let skipped = 0;
  for (const r of Array.isArray(json) ? (json as Array<Record<string, unknown>>) : []) {
    const close = num(r.close);
    if (!isDate(r.date) || close === null || d(close).lte(-5) || d(close).gte(60)) {
      skipped++;
      continue;
    }
    rows.push({ seriesKey, date: r.date, value: d(close).div(100).toString() });
  }
  return { rows, skipped };
}

export function parseDividends(json: unknown, fallbackCurrency: string): { rows: EodDividend[]; skipped: number } {
  const rows: EodDividend[] = [];
  let skipped = 0;
  for (const r of Array.isArray(json) ? (json as Array<Record<string, unknown>>) : []) {
    // unadjustedValue is the cash per share actually paid at the time (matches raw closes).
    const amount = num(r.unadjustedValue) ?? num(r.value);
    if (!isDate(r.date) || amount === null || d(amount).lte(0)) {
      skipped++;
      continue;
    }
    const n = normaliseCurrency(amount, typeof r.currency === "string" && r.currency ? r.currency : fallbackCurrency);
    rows.push({ exDate: r.date, payDate: isDate(r.paymentDate) ? r.paymentDate : null, amount: n.value, currency: n.currency });
  }
  return { rows, skipped };
}

/** "4.000000/1.000000" → "4" (shares after per share before). */
export function parseSplits(json: unknown): { rows: EodSplit[]; skipped: number } {
  const rows: EodSplit[] = [];
  let skipped = 0;
  for (const r of Array.isArray(json) ? (json as Array<Record<string, unknown>>) : []) {
    const m = /^\s*([\d.]+)\s*\/\s*([\d.]+)\s*$/.exec(String(r.split ?? ""));
    if (!isDate(r.date) || !m || d(m[2]!).lte(0) || d(m[1]!).lte(0)) {
      skipped++;
      continue;
    }
    rows.push({ exDate: r.date, ratio: d(m[1]!).div(d(m[2]!)).toString() });
  }
  return { rows, skipped };
}

export interface FundamentalsYear {
  fiscalYearEnd: ISODate;
  revenue: string | null;
  grossProfit: string | null;
  operatingIncome: string | null;
  netIncome: string | null;
  totalAssets: string | null;
  totalLiabilities: string | null;
  equity: string | null;
  cash: string | null;
  totalDebt: string | null;
  operatingCashFlow: string | null;
  capex: string | null;
  freeCashFlow: string | null;
  dividendsPaid: string | null;
}

export interface Fundamentals {
  profile: {
    name: string | null;
    type: string | null;
    exchange: string | null;
    currency: string | null;
    country: string | null;
    isin: string | null;
    sector: string | null;
    industry: string | null;
    description: string | null;
    website: string | null;
    ipoDate: ISODate | null;
    employees: number | null;
    fiscalYearEnd: string | null;
  };
  /** Point-in-time figures as reported by EODHD (TTM where stated). */
  snapshot: Record<string, string | null>;
  financialsCurrency: string | null;
  yearly: FundamentalsYear[];
  /** ETFs: expense ratio, holdings count, top holdings, sector weights (when present). */
  fund: Record<string, unknown> | null;
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

export function parseFundamentals(json: unknown): Fundamentals | null {
  if (!json || typeof json !== "object" || !("General" in json)) return null;
  const j = json as Record<string, Record<string, unknown>>;
  const g = j.General ?? {};
  const h = j.Highlights ?? {};
  const v = j.Valuation ?? {};
  const s = j.SharesStats ?? {};
  const snapshot: Record<string, string | null> = {
    marketCap: num(h.MarketCapitalization),
    revenueTTM: num(h.RevenueTTM),
    ebitda: num(h.EBITDA),
    profitMargin: num(h.ProfitMargin),
    operatingMarginTTM: num(h.OperatingMarginTTM),
    returnOnEquityTTM: num(h.ReturnOnEquityTTM),
    returnOnAssetsTTM: num(h.ReturnOnAssetsTTM),
    earningsPerShare: num(h.EarningsShare),
    dividendPerShare: num(h.DividendShare),
    dividendYield: num(h.DividendYield),
    bookValuePerShare: num(h.BookValue),
    trailingPE: num(v.TrailingPE ?? h.PERatio),
    priceToSales: num(v.PriceSalesTTM),
    priceToBook: num(v.PriceBookMRQ),
    evToEbitda: num(v.EnterpriseValueEbitda),
    enterpriseValue: num(v.EnterpriseValue),
    sharesOutstanding: num(s.SharesOutstanding),
    percentInsiders: num(s.PercentInsiders),
    percentInstitutions: num(s.PercentInstitutions),
  };
  const fin = (j.Financials ?? {}) as Record<string, Record<string, Record<string, Record<string, unknown>>>>;
  const inc = fin.Income_Statement?.yearly ?? {};
  const bal = fin.Balance_Sheet?.yearly ?? {};
  const cf = fin.Cash_Flow?.yearly ?? {};
  const years = [...new Set([...Object.keys(inc), ...Object.keys(bal), ...Object.keys(cf)])].filter(isDate).sort();
  const yearly: FundamentalsYear[] = years.map((y) => {
    const i = inc[y] ?? {};
    const b = bal[y] ?? {};
    const c = cf[y] ?? {};
    const ocf = num(c.totalCashFromOperatingActivities);
    const capex = num(c.capitalExpenditures);
    return {
      fiscalYearEnd: y,
      revenue: num(i.totalRevenue),
      grossProfit: num(i.grossProfit),
      operatingIncome: num(i.operatingIncome),
      netIncome: num(i.netIncome),
      totalAssets: num(b.totalAssets),
      totalLiabilities: num(b.totalLiab),
      equity: num(b.totalStockholderEquity),
      cash: num(b.cash),
      totalDebt: num(b.shortLongTermDebtTotal),
      operatingCashFlow: ocf,
      capex,
      freeCashFlow: num(c.freeCashFlow) ?? (ocf !== null && capex !== null ? d(ocf).minus(d(capex).abs()).toString() : null),
      dividendsPaid: num(c.dividendsPaid),
    };
  });
  const etf = (j.ETF_Data ?? null) as Record<string, unknown> | null;
  const fund = etf
    ? {
        expenseRatio: num(etf.NetExpenseRatio),
        totalAssets: num(etf.TotalAssets),
        holdingsCount: num(etf.Holdings_Count),
        inceptionDate: str(etf.Inception_Date),
        domicile: str(etf.Domicile),
        indexName: str(etf.Index_Name),
        yield: num(etf.Yield),
        sectorWeights: etf.Sector_Weights ?? null,
        worldRegions: etf.World_Regions ?? null,
        topHoldings: etf.Top_10_Holdings ?? null,
      }
    : null;
  return {
    profile: {
      name: str(g.Name),
      type: str(g.Type),
      exchange: str(g.Exchange),
      currency: str(g.CurrencyCode),
      country: str(g.CountryISO),
      isin: str(g.ISIN),
      sector: str(g.Sector),
      industry: str(g.Industry),
      description: str(g.Description),
      website: str(g.WebURL),
      ipoDate: isDate(g.IPODate) ? g.IPODate : null,
      employees: typeof g.FullTimeEmployees === "number" ? g.FullTimeEmployees : null,
      fiscalYearEnd: str(g.FiscalYearEnd),
    },
    snapshot,
    financialsCurrency: str((fin.Income_Statement as unknown as Record<string, unknown> | undefined)?.currency_symbol),
    yearly,
    fund,
  };
}

/** EODHD/Morningstar-style sector names → our open taxonomy. Unknown → null (left unclassified). */
const SECTOR_MAP: Record<string, string> = {
  technology: "technology", "information technology": "technology", "financial services": "financials", financials: "financials", financial: "financials",
  healthcare: "healthcare", "health care": "healthcare", "consumer cyclical": "consumer-services", "consumer discretionary": "consumer-services",
  "consumer defensive": "consumer-goods", "consumer staples": "consumer-goods", "consumer goods": "consumer-goods", industrials: "industrials", "industrial goods": "industrials",
  energy: "energy", "oil & gas": "energy", utilities: "utilities", "real estate": "real-estate", "basic materials": "materials", materials: "materials",
  "communication services": "telecoms", telecommunications: "telecoms", ict: "telecoms", agriculture: "agriculture", conglomerates: "conglomerates", "construction/real estate": "industrials",
};
export function mapSector(sector: string | null, type: string | null): string | null {
  if (type && /etf|fund/i.test(type)) return null;
  return sector ? (SECTOR_MAP[sector.toLowerCase()] ?? null) : null;
}

export interface EodhdUsage { used: number; limit: number }

/** Minimal client that never exceeds a call budget. The key is read from the environment by the caller. */
export class EodhdClient {
  calls = 0;
  constructor(private readonly apiKey: string, private readonly budget: number, private readonly fetchImpl: typeof fetch = fetch) {}

  remaining(): number {
    return this.budget - this.calls;
  }

  async usage(): Promise<EodhdUsage | null> {
    const r = await this.fetchImpl(`${EODHD_BASE}/user?api_token=${encodeURIComponent(this.apiKey)}&fmt=json`, { signal: AbortSignal.timeout(30_000) });
    if (!r.ok) return null;
    const j = (await r.json()) as { apiRequests?: number; dailyRateLimit?: number };
    return typeof j.apiRequests === "number" && typeof j.dailyRateLimit === "number" ? { used: j.apiRequests, limit: j.dailyRateLimit } : null;
  }

  async get(kind: keyof typeof EODHD_CALL_COST, path: string, params: Record<string, string> = {}): Promise<unknown> {
    const cost = EODHD_CALL_COST[kind];
    if (this.calls + cost > this.budget) throw new BudgetExhausted();
    const q = new URLSearchParams({ ...params, api_token: this.apiKey, fmt: "json" });
    this.calls += cost;
    const r = await this.fetchImpl(`${EODHD_BASE}/${path}?${q}`, { signal: AbortSignal.timeout(120_000) });
    if (r.status === 404) return null;
    if (r.status === 402 || r.status === 403) throw new Error(`EODHD refused ${kind} for this plan (HTTP ${r.status})`);
    if (r.status === 429) throw new BudgetExhausted();
    if (!r.ok) throw new Error(`EODHD ${kind} → HTTP ${r.status}`);
    return r.json();
  }
}

export class BudgetExhausted extends Error {
  constructor() {
    super("EODHD daily call budget reached");
  }
}
