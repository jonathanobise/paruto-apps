/**
 * The research universe, in ingestion priority order. Codes are EODHD symbols (TICKER.EXCHANGE).
 * Nigerian equities are discovered from EODHD's XNSA symbol list rather than listed here.
 * A code EODHD doesn't recognise is reported by the ingester and skipped — never guessed.
 *
 * Benchmarks: index levels need the index owner's licence for display, so asset classes are
 * represented by widely held tracking ETFs (the Nigerian T-bill benchmark is computed from CBN
 * auctions). A benchmark's ETF is a proxy and is labelled as such.
 */
export type Market = "ng" | "us" | "uk" | "global";

export interface UniverseEntry {
  code: string;
  market: Market;
  benchmarkKey?: string;
  /** What the benchmark stands for on the scoreboard. */
  benchmarkLabel?: string;
}

export const BENCHMARKS: UniverseEntry[] = [
  { code: "VTI.US", market: "us", benchmarkKey: "us-equity", benchmarkLabel: "US stocks (total market ETF)" },
  { code: "IEF.US", market: "us", benchmarkKey: "us-treasuries", benchmarkLabel: "US Treasuries 7–10 year (ETF)" },
  { code: "SHV.US", market: "us", benchmarkKey: "usd-cash", benchmarkLabel: "US dollar cash: short Treasury ETF" },
  { code: "ISF.LSE", market: "uk", benchmarkKey: "uk-equity", benchmarkLabel: "UK large companies (FTSE 100 ETF)" },
  { code: "IGLT.LSE", market: "uk", benchmarkKey: "uk-gilts", benchmarkLabel: "UK gilts (ETF)" },
  { code: "ACWI.US", market: "global", benchmarkKey: "global-equity", benchmarkLabel: "Global stocks (all-country ETF)" },
  { code: "EEM.US", market: "global", benchmarkKey: "em-equity", benchmarkLabel: "Emerging-market stocks (ETF)" },
  { code: "GLD.US", market: "global", benchmarkKey: "gold", benchmarkLabel: "Gold (physically backed ETF)" },
  { code: "VNQ.US", market: "us", benchmarkKey: "us-reits", benchmarkLabel: "US real estate (REIT ETF)" },
  { code: "BNDX.US", market: "global", benchmarkKey: "global-bonds", benchmarkLabel: "Global bonds ex-US, USD hedged (ETF)" },
];

export const ETFS: UniverseEntry[] = [
  ...["SPY", "VOO", "QQQ", "IWM", "DIA", "VEA", "VWO", "VXUS", "BND", "AGG", "TLT", "SHY", "TIP", "LQD", "HYG", "IAU", "SLV", "SCHD", "VIG", "VYM", "XLK", "XLF", "XLE", "XLV", "XLY", "XLP", "XLI", "XLU", "XLB", "XLRE", "XLC", "SMH", "ARKK"].map((t) => ({ code: `${t}.US`, market: (["VEA", "VWO", "VXUS", "IAU", "SLV"].includes(t) ? "global" : "us") as Market })),
  ...["VWRA", "VWRL", "SWDA", "CSPX", "VUSA", "EIMI", "IGLN", "VUKE", "VMID", "AGGU", "IB01"].map((t) => ({ code: `${t}.LSE`, market: (["VUKE", "VMID"].includes(t) ? "uk" : "global") as Market })),
];

export const US_STOCKS = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "BRK-B", "AVGO", "TSLA", "JPM", "LLY", "V", "MA", "UNH", "XOM", "JNJ", "PG", "HD", "COST", "WMT", "KO", "PEP", "MRK", "ABBV", "BAC", "CVX", "NFLX", "ADBE", "CRM", "ORCL", "AMD", "INTC", "DIS", "MCD", "NKE", "CAT", "GE", "BA", "GS", "MS"].map((t) => ({ code: `${t}.US`, market: "us" as Market }));

export const UK_STOCKS = ["SHEL", "AZN", "HSBA", "ULVR", "BP", "GSK", "RIO", "BATS", "REL", "LSEG", "DGE", "NG", "LLOY", "BARC", "VOD", "RR", "TSCO", "GLEN", "AAL", "BT-A", "IMB", "PRU", "LGEN", "SSE", "BA"].map((t) => ({ code: `${t}.LSE`, market: "uk" as Market }));

/** Everything listed above, in priority order (Nigerian stocks are appended at run time). */
export const CURATED: UniverseEntry[] = [...BENCHMARKS, ...ETFS, ...US_STOCKS, ...UK_STOCKS];

export function marketOfCode(code: string): Market {
  if (code.endsWith(".XNSA")) return "ng";
  if (code.endsWith(".LSE")) return "uk";
  return "us";
}
