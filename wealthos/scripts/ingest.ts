/**
 * Ingest real data from official sources into the research catalogue (owner role; operator script).
 *
 *   npm run ingest -- all
 *   npm run ingest -- cbn-fx cbn-inflation cbn-money-market cbn-auctions fed-funds boe-bank-rate ons-cpi
 *
 * Every row keeps its provenance (source, methodology, retrieval time). Re-running is safe: rows are
 * upserted on (series/instrument, date, source); a value the source has since revised is updated.
 * Derived series (the rolled T-bill index) are recomputed from the stored auction results.
 * Sources and their terms: docs/DATA_SOURCES.md.
 */
import { config } from "dotenv";
import pg from "pg";

config({ path: process.env.ENV_FILE ?? ".env.local", quiet: true });

const { parseBoeCsv, parseCbnAuctions, parseCbnExchangeRates, parseCbnInflation, parseCbnMoneyMarket, parseFedH15Csv, parseOnsMonthlyCsv } = await import("../src/server/ingest/official");
const { OFFICIAL_SOURCES, MACRO_SERIES, AUCTION_INSTRUMENTS, DERIVED } = await import("../src/server/ingest/catalogue");
const { rolledBillIndex, d } = await import("../src/engine");

const ownerUrl = process.env.DATABASE_OWNER_URL;
if (!ownerUrl) throw new Error("DATABASE_OWNER_URL is required");
const pool = new pg.Pool({ connectionString: ownerUrl, max: 2 });
const UA = "Mozilla/5.0 (compatible; ParutoWealthResearch/1.0; +https://paruto.com)";

async function get(url: string): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    try {
      const r = await fetch(url, { headers: { "user-agent": UA, accept: "*/*" }, signal: AbortSignal.timeout(120_000) });
      if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
      return await r.text();
    } catch (err) {
      if (attempt >= 3) throw err;
      await new Promise((res) => setTimeout(res, attempt * 3000));
    }
  }
}

const sourceIds = new Map<string, string>();
async function source(key: string): Promise<string> {
  const hit = sourceIds.get(key);
  if (hit) return hit;
  const s = OFFICIAL_SOURCES[key];
  if (!s) throw new Error(`unknown source ${key}`);
  const r = await pool.query(
    `insert into market_data_sources (key, name, kind, url, license_note, default_freshness_days) values ($1,$2,$3,$4,$5,$6)
     on conflict (key) do update set name = excluded.name, kind = excluded.kind, url = excluded.url, license_note = excluded.license_note, default_freshness_days = excluded.default_freshness_days
     returning id`,
    [key, s.name, s.kind, s.url, s.licenseNote, s.freshnessDays],
  );
  sourceIds.set(key, r.rows[0].id);
  return r.rows[0].id;
}

async function chunked<T>(rows: T[], size: number, fn: (chunk: T[]) => Promise<void>) {
  for (let i = 0; i < rows.length; i += size) await fn(rows.slice(i, i + size));
}

async function upsertMacro(rows: Array<{ seriesKey: string; date: string; value: string }>, sourceKey: string) {
  const sourceId = await source(sourceKey);
  const ids = new Map<string, string>();
  for (const key of new Set(rows.map((r) => r.seriesKey))) {
    const def = MACRO_SERIES[key];
    if (!def) throw new Error(`no definition for macro series ${key}`);
    const r = await pool.query(
      `insert into macro_series (key, name, country, unit, frequency, description, source_id) values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (key) do update set name = excluded.name, unit = excluded.unit, frequency = excluded.frequency, description = excluded.description, source_id = excluded.source_id
       returning id`,
      [key, def.name, def.country, def.unit, def.frequency, def.description, sourceId],
    );
    ids.set(key, r.rows[0].id);
  }
  await chunked(rows, 1000, async (chunk) => {
    const values = chunk.map((_, j) => `($${j * 3 + 1}::uuid,$${j * 3 + 2}::date,$${j * 3 + 3}::numeric,'${sourceId}','verified')`).join(",");
    await pool.query(
      `insert into macro_observations (series_id, observed_on, value, source_id, verification_state) values ${values}
       on conflict (series_id, observed_on, source_id) do update set value = excluded.value, retrieved_at = now() where macro_observations.value <> excluded.value`,
      chunk.flatMap((r) => [ids.get(r.seriesKey)!, r.date, r.value]),
    );
  });
  return rows.length;
}

async function ensureInstrument(def: { symbol: string; name: string; issuer: string; assetClass: string; market: string; country: string; region: string; currency: string; pricingModel: string; sectorKey: string; industryKey: string; benchmarkKey?: string; officialUrl?: string; staleAfterDays: number }): Promise<string> {
  const existing = await pool.query("select id from instruments where symbol = $1 and org_id is null and not is_demo", [def.symbol]);
  if (existing.rows[0]) {
    await pool.query(
      `update instruments set name=$2, issuer=$3, market=$4, sector_key=$5, industry_key=$6, benchmark_key=$7, official_url=$8, stale_after_days=$9, updated_at=now() where id=$1`,
      [existing.rows[0].id, def.name, def.issuer, def.market, def.sectorKey, def.industryKey, def.benchmarkKey ?? null, def.officialUrl ?? null, def.staleAfterDays],
    );
    return existing.rows[0].id;
  }
  const r = await pool.query(
    `insert into instruments (symbol, name, issuer, asset_class, country, region, currency, pricing_model, stale_after_days, verification_state, verified_at, market, sector_key, industry_key, benchmark_key, official_url)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'verified',now(),$10,$11,$12,$13,$14) returning id`,
    [def.symbol, def.name, def.issuer, def.assetClass, def.country, def.region, def.currency, def.pricingModel, def.staleAfterDays, def.market, def.sectorKey, def.industryKey, def.benchmarkKey ?? null, def.officialUrl ?? null],
  );
  return r.rows[0].id;
}

const TASKS: Record<string, () => Promise<string>> = {
  "cbn-fx": async () => {
    const parsed = parseCbnExchangeRates(JSON.parse(await get("https://www.cbn.gov.ng/api/GetAllExchangeRates")));
    const sourceId = await source("cbn");
    await chunked(parsed.rows, 1000, async (chunk) => {
      const values = chunk.map((_, j) => `($${j * 4 + 1},$${j * 4 + 2},$${j * 4 + 3}::numeric,$${j * 4 + 4}::date,'${sourceId}','official','verified')`).join(",");
      await pool.query(
        `insert into fx_rates (base, quote, rate, observed_on, source_id, methodology, verification_state) values ${values}
         on conflict (base, quote, source_id, observed_on) do update set rate = excluded.rate, retrieved_at = now() where fx_rates.rate <> excluded.rate`,
        chunk.flatMap((r) => [r.base, r.quote, r.rate, r.date]),
      );
    });
    return `${parsed.rows.length} official rates (${parsed.skipped} rows skipped${parsed.notes.length ? `; ${parsed.notes.join("; ")}` : ""})`;
  },
  "cbn-inflation": async () => {
    const parsed = parseCbnInflation(JSON.parse(await get("https://www.cbn.gov.ng/api/GetAllInflationRates")));
    return `${await upsertMacro(parsed.rows, "cbn")} observations (${parsed.skipped} skipped)`;
  },
  "cbn-money-market": async () => {
    const parsed = parseCbnMoneyMarket(JSON.parse(await get("https://www.cbn.gov.ng/api/GetAllMoneyMarketIndicators")));
    return `${await upsertMacro(parsed.rows, "cbn")} observations (${parsed.skipped} skipped)`;
  },
  "cbn-auctions": async () => {
    const sourceId = await source("cbn");
    const ntb = parseCbnAuctions(JSON.parse(await get("https://www.cbn.gov.ng/api/GetAllSecuritiesNTB")), "NTB");
    const bonds = parseCbnAuctions(JSON.parse(await get("https://www.cbn.gov.ng/api/GetAllSecuritiesFGNBond")), "FGN_BOND");
    let stored = 0;
    for (const def of AUCTION_INSTRUMENTS) {
      const rows = (def.security === "NTB" ? ntb.rows : bonds.rows).filter(def.match);
      if (!rows.length) continue;
      const id = await ensureInstrument(def);
      // One result per auction date and tenor (the CBN occasionally lists a re-opening twice).
      const unique = [...new Map(rows.map((r) => [`${r.auctionDate}|${r.tenorDays}`, r])).values()];
      await chunked(unique, 500, async (chunk) => {
        const values = chunk.map((_, j) => `('${id}','${def.methodology}',$${j * 3 + 1}::numeric,$${j * 3 + 2}::int,$${j * 3 + 3}::date,'${sourceId}','${def.sourceUrl}','verified','${def.basis}')`).join(",");
        await pool.query(
          `insert into published_rates (instrument_id, methodology, value, tenor_days, as_of, source_id, source_url, verification_state, basis) values ${values}
           on conflict on constraint published_rates_unique_obs do update set value = excluded.value, retrieved_at = now() where published_rates.value <> excluded.value`,
          chunk.flatMap((r) => [r.rate, r.tenorDays, r.auctionDate]),
        );
      });
      stored += unique.length;
    }
    // Derived: rolled 91-day T-bill total-return index from the 91-day primary auction stop rates.
    const today = new Date().toISOString().slice(0, 10);
    const auctions = ntb.rows.filter((r) => r.tenorDays === 91 && r.auctionDate >= DERIVED.tbillIndex.from).map((r) => ({ date: r.auctionDate, discountRate: d(r.rate), tenorDays: 91, maturity: r.maturityDate }));
    const index = rolledBillIndex(auctions, today);
    const derivedSource = await source("paruto-derived");
    const idxId = await ensureInstrument(DERIVED.tbillIndex.instrument);
    await pool.query("delete from market_prices where instrument_id = $1 and source_id = $2", [idxId, derivedSource]);
    await chunked(index, 1000, async (chunk) => {
      const values = chunk.map((_, j) => `('${idxId}','${derivedSource}',$${j * 2 + 1}::date,$${j * 2 + 2}::numeric,'NGN','index','verified')`).join(",");
      await pool.query(`insert into market_prices (instrument_id, source_id, observed_on, price, currency, methodology, verification_state) values ${values}`, chunk.flatMap((p) => [p.date, p.value.toDecimalPlaces(8).toString()]));
    });
    return `${stored} auction results (NTB ${ntb.rows.length}, FGN bonds ${bonds.rows.length}; ${ntb.skipped + bonds.skipped} non-primary or unusable rows skipped); T-bill index ${index.length} points from ${auctions.length} auctions`;
  },
  "fed-funds": async () => {
    const parsed = parseFedH15Csv(await get("https://www.federalreserve.gov/datadownload/Output.aspx?rel=H15&series=c5025f4bbbed155a6f17c587772ed69e&lastobs=&from=&to=&filetype=csv&label=include&layout=seriescolumn"), "US.FEDFUNDS");
    parsed.rows = parsed.rows.filter((r) => r.date >= "2000-01-01");
    return `${await upsertMacro(parsed.rows, "federal-reserve")} observations (${parsed.skipped} no-data days)`;
  },
  "boe-bank-rate": async () => {
    const parsed = parseBoeCsv(await get("https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp?csv.x=yes&Datefrom=01/Jan/2000&Dateto=now&SeriesCodes=IUDBEDR&CSVF=TN&UsingCodes=Y&VPD=Y&VFD=N"), "UK.BANKRATE");
    return `${await upsertMacro(parsed.rows, "bank-of-england")} rate changes`;
  },
  "ons-cpi": async () => {
    const parsed = parseOnsMonthlyCsv(await get("https://www.ons.gov.uk/generator?format=csv&uri=/economy/inflationandpriceindices/timeseries/d7bt/mm23"), "UK.CPI");
    return `${await upsertMacro(parsed.rows, "ons")} monthly index values`;
  },
};

const ALL = ["cbn-fx", "cbn-inflation", "cbn-money-market", "cbn-auctions", "fed-funds", "boe-bank-rate", "ons-cpi"];
const requested = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const tasks = requested.includes("all") || requested.length === 0 ? ALL : requested;
let failed = 0;
try {
  for (const t of tasks) {
    const fn = TASKS[t];
    if (!fn) {
      console.error(`unknown task ${t}; known: ${Object.keys(TASKS).join(", ")}`);
      failed++;
      continue;
    }
    const started = Date.now();
    try {
      console.log(`${t}: ${await fn()} [${((Date.now() - started) / 1000).toFixed(1)}s]`);
    } catch (err) {
      failed++;
      console.error(`${t}: FAILED — ${err instanceof Error ? err.message : String(err)}`);
    }
  }
} finally {
  await pool.end();
}
process.exitCode = failed ? 1 : 0;
