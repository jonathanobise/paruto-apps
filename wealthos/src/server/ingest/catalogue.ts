/**
 * Definitions for data ingested from official sources: the source register entries (with licence
 * notes shown next to every figure), the macro series, the instruments that carry auction results,
 * and derived series. See docs/DATA_SOURCES.md for terms and the evidence behind each note.
 */
import type { AuctionResult } from "./official";

export interface SourceDef {
  name: string;
  kind: "official" | "licensed" | "derived";
  url: string;
  licenseNote: string;
  freshnessDays: number;
}

export const OFFICIAL_SOURCES: Record<string, SourceDef> = {
  cbn: {
    name: "Central Bank of Nigeria",
    kind: "official",
    url: "https://www.cbn.gov.ng/rates/",
    licenseNote: "Source: Central Bank of Nigeria. CBN terms: copying is permitted provided the CBN is stated expressly as the source, without amending or distorting the content (cbn.gov.ng/Legal.html).",
    freshnessDays: 7,
  },
  "federal-reserve": {
    name: "Board of Governors of the Federal Reserve System (H.15)",
    kind: "official",
    url: "https://www.federalreserve.gov/releases/h15/",
    licenseNote: "Source: Board of Governors of the Federal Reserve System, statistical release H.15. Public domain; citation requested.",
    freshnessDays: 7,
  },
  "bank-of-england": {
    name: "Bank of England",
    kind: "official",
    url: "https://www.bankofengland.co.uk/boeapps/database/",
    licenseNote: "Source: Bank of England Database (IUDBEDR). Reproduced under the UK Open Government Licence v3.0.",
    freshnessDays: 45,
  },
  bls: {
    name: "US Bureau of Labor Statistics",
    kind: "official",
    url: "https://www.bls.gov/cpi/",
    licenseNote: "Source: U.S. Bureau of Labor Statistics. BLS: \"everything that we publish… is in the public domain\"; citation requested.",
    freshnessDays: 45,
  },
  ons: {
    name: "Office for National Statistics",
    kind: "official",
    url: "https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7bt/mm23",
    licenseNote: "Source: Office for National Statistics licensed under the Open Government Licence v3.0.",
    freshnessDays: 45,
  },
  eodhd: {
    name: "EODHD (EOD Historical Data)",
    kind: "licensed",
    url: "https://eodhd.com",
    licenseNote: "End-of-day prices, dividends, splits and fundamentals licensed from EODHD under the owner's subscription, for the subscriber's own use. Not for display to others without a display licence (docs/DATA_SOURCES.md).",
    freshnessDays: 5,
  },
  "paruto-derived": {
    name: "Computed by us from official data",
    kind: "derived",
    url: "https://www.cbn.gov.ng/rates/govtsecurities.html",
    licenseNote: "Computed from official source data with the documented method shown on the page; inherits the source's attribution.",
    freshnessDays: 21,
  },
};

export interface MacroDef {
  name: string;
  country: string;
  unit: "index" | "percent";
  frequency: "monthly" | "daily" | "event";
  description: string;
}

export const MACRO_SERIES: Record<string, MacroDef> = {
  "NG.CPI_YOY": { name: "Nigeria headline inflation (year on year)", country: "NG", unit: "percent", frequency: "monthly", description: "All-items CPI, change on the same month a year earlier, as published by the CBN from NBS data. The CPI was rebased in January 2025, so rates before and after are on different baskets." },
  "NG.FOOD_YOY": { name: "Nigeria food inflation (year on year)", country: "NG", unit: "percent", frequency: "monthly", description: "Food CPI, change on the same month a year earlier." },
  "NG.CORE_YOY": { name: "Nigeria core inflation (year on year)", country: "NG", unit: "percent", frequency: "monthly", description: "All items less farm produce and energy, change on the same month a year earlier." },
  "NG.MPR": { name: "Nigeria Monetary Policy Rate", country: "NG", unit: "percent", frequency: "monthly", description: "CBN Monetary Policy Rate, month-end value as reported in the CBN money-market indicators." },
  "NG.INTERBANK_CALL": { name: "Nigeria interbank call rate", country: "NG", unit: "percent", frequency: "monthly", description: "Monthly interbank call rate (CBN money-market indicators)." },
  "NG.TBILL_RATE": { name: "Nigeria Treasury bill rate", country: "NG", unit: "percent", frequency: "monthly", description: "Monthly Treasury bill rate (CBN money-market indicators)." },
  "NG.SAVINGS_DEPOSIT": { name: "Nigeria savings deposit rate", country: "NG", unit: "percent", frequency: "monthly", description: "Average savings deposit rate (CBN money-market indicators)." },
  "NG.DEPOSIT_12M": { name: "Nigeria 12-month deposit rate", country: "NG", unit: "percent", frequency: "monthly", description: "Average 12-month deposit rate (CBN money-market indicators)." },
  "NG.PRIME_LENDING": { name: "Nigeria prime lending rate", country: "NG", unit: "percent", frequency: "monthly", description: "Average prime lending rate (CBN money-market indicators)." },
  "NG.MAX_LENDING": { name: "Nigeria maximum lending rate", country: "NG", unit: "percent", frequency: "monthly", description: "Average maximum lending rate (CBN money-market indicators)." },
  "US.FEDFUNDS": { name: "US effective federal funds rate", country: "US", unit: "percent", frequency: "daily", description: "Effective federal funds rate, daily (Federal Reserve H.15)." },
  "UK.BANKRATE": { name: "UK Bank Rate", country: "GB", unit: "percent", frequency: "event", description: "Bank of England official Bank Rate; one value per change." },
  "US.CPI": { name: "US consumer price index (CPI-U, 1982–84 = 100)", country: "US", unit: "index", frequency: "monthly", description: "All items, U.S. city average, not seasonally adjusted (BLS series CUUR0000SA0)." },
  "UK.CPI": { name: "UK consumer price index (2015 = 100)", country: "GB", unit: "index", frequency: "monthly", description: "ONS CPI index, all items (series D7BT)." },
};

const ng = { market: "ng", country: "NG", region: "Africa", currency: "NGN", issuer: "Federal Government of Nigeria", sectorKey: "government" } as const;

function years(r: AuctionResult): number {
  const m = /(\d+)\s*YEAR/i.exec(r.tenorLabel);
  return m ? Number(m[1]) : Math.round(r.tenorDays / 365);
}

export interface AuctionInstrumentDef {
  security: "NTB" | "FGN_BOND";
  match: (r: AuctionResult) => boolean;
  methodology: "discount_rate" | "yield_to_maturity";
  basis: string;
  sourceUrl: string;
  symbol: string;
  name: string;
  issuer: string;
  assetClass: string;
  market: string;
  country: string;
  region: string;
  currency: string;
  pricingModel: string;
  sectorKey: string;
  industryKey: string;
  officialUrl: string;
  staleAfterDays: number;
}

const ntb = (days: number): AuctionInstrumentDef => ({
  ...ng,
  security: "NTB",
  match: (r) => r.tenorDays === days,
  methodology: "discount_rate",
  basis: "Primary auction stop rate, discount basis, actual/365",
  sourceUrl: "https://www.cbn.gov.ng/rates/govtsecurities.html",
  symbol: `NG-NTB-${days}D`,
  name: `Nigerian Treasury bills, ${days}-day (primary auctions)`,
  assetClass: "treasury_bill",
  pricingModel: "discount_accrual",
  industryKey: "government.bills",
  officialUrl: "https://www.cbn.gov.ng/rates/govtsecurities.html",
  staleAfterDays: 21,
});

const bond = (y: number): AuctionInstrumentDef => ({
  ...ng,
  security: "FGN_BOND",
  match: (r) => years(r) === y,
  methodology: "yield_to_maturity",
  basis: "Primary auction marginal rate (yield)",
  sourceUrl: "https://www.cbn.gov.ng/rates/govtsecurities.html",
  symbol: `NG-FGN-${y}Y`,
  name: `FGN bonds, ${y}-year (primary auctions)`,
  assetClass: "government_bond",
  pricingModel: "market",
  industryKey: "government.bonds",
  officialUrl: "https://www.cbn.gov.ng/rates/govtsecurities.html",
  staleAfterDays: 60,
});

export const AUCTION_INSTRUMENTS: AuctionInstrumentDef[] = [ntb(91), ntb(182), ntb(364), ...[2, 3, 5, 7, 10, 15, 20, 25, 30].map(bond)];

export const DERIVED = {
  tbillIndex: {
    from: "2002-01-01",
    instrument: {
      ...ng,
      symbol: "NG-TBILL-91-ROLLED",
      name: "Nigerian T-bills, 91-day rolled (total-return index)",
      issuer: "Computed from CBN primary auction results",
      assetClass: "index",
      pricingModel: "market",
      industryKey: "government.bills",
      benchmarkKey: "ng-tbills",
      officialUrl: "https://www.cbn.gov.ng/rates/govtsecurities.html",
      staleAfterDays: 35,
    },
  },
};
