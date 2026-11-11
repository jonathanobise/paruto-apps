/**
 * Ingest real data from official sources into the research catalogue (owner role; operator script).
 *
 *   npm run ingest -- all                 (add --keep-going to leave out a failed source; deploy builds do)
 *   npm run ingest -- cbn-fx cbn-inflation cbn-money-market cbn-auctions fed-funds boe-bank-rate ons-cpi
 *
 * Every row keeps its provenance (source, methodology, retrieval time). Re-running is safe: rows are
 * upserted on (series/instrument, date, source); a value the source has since revised is updated.
 * Derived series (the rolled T-bill index) are recomputed from the stored auction results.
 * Sources and their terms: docs/DATA_SOURCES.md.
 */
import { writeFileSync } from "node:fs";
import { config } from "dotenv";
import pg from "pg";

config({ path: process.env.ENV_FILE ?? ".env.local", quiet: true });

const { parseBlsSeries, parseBoeCsv, parseCbnAuctions, parseCbnExchangeRates, parseCbnInflation, parseCbnMoneyMarket, parseFedH15Csv, parseOnsMonthlyCsv } = await import("../src/server/ingest/official");
const { OFFICIAL_SOURCES, MACRO_SERIES, AUCTION_INSTRUMENTS, DERIVED } = await import("../src/server/ingest/catalogue");
const { rolledBillIndex, d } = await import("../src/engine");
const { BudgetExhausted, EodhdClient, mapSector, normaliseCurrency, parseDividends, parseEod, parseFundamentals, parseSplits } = await import("../src/server/ingest/eodhd");
const { CURATED, marketOfCode } = await import("../src/server/ingest/universe");

const FLAGS = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => { const [k, v] = a.slice(2).split("="); return [k!, v ?? "1"]; }));

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
    for (const r of parsed.rejected) await pool.query("delete from fx_rates where base = $1 and quote = $2 and observed_on = $3 and source_id = $4", [r.base, r.quote, r.date, sourceId]);
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
  "bls-cpi": async () => {
    // Without a key BLS allows ~25 requests a day and 10 years per request; with BLS_API_KEY, 500 and 20.
    const key = process.env.BLS_API_KEY;
    const span = key ? 20 : 10;
    const thisYear = new Date().getUTCFullYear();
    const rows: Array<{ seriesKey: string; date: string; value: string }> = [];
    const notes: string[] = [];
    for (let start = 2000; start <= thisYear; start += span) {
      const r = await fetch("https://api.bls.gov/publicAPI/v2/timeseries/data/", {
        method: "POST",
        headers: { "content-type": "application/json", "user-agent": UA },
        body: JSON.stringify({ seriesid: ["CUUR0000SA0"], startyear: String(start), endyear: String(Math.min(start + span - 1, thisYear)), ...(key ? { registrationkey: key } : {}) }),
        signal: AbortSignal.timeout(60_000),
      });
      const parsed = parseBlsSeries(await r.json(), "US.CPI");
      rows.push(...parsed.rows);
      notes.push(...parsed.notes);
    }
    if (!rows.length) throw new Error(`no data${notes.length ? `: ${notes.join("; ")}` : ""}${key ? "" : " (no BLS_API_KEY set)"}`);
    return `${await upsertMacro(rows, "bls")} monthly index values${notes.length ? ` (${notes.join("; ")})` : ""}`;
  },
  "ons-cpi": async () => {
    const parsed = parseOnsMonthlyCsv(await get("https://www.ons.gov.uk/generator?format=csv&uri=/economy/inflationandpriceindices/timeseries/d7bt/mm23"), "UK.CPI");
    return `${await upsertMacro(parsed.rows, "ons")} monthly index values`;
  },
};

// ---------------------------------------------------------------- EODHD (licensed; owner's subscription)

type SymbolMeta = { Code: string; Name: string; Country: string; Exchange: string; Currency: string; Type: string; Isin: string | null };
const ASSET_CLASS: Record<string, string> = { "common stock": "equity", "preferred stock": "equity", etf: "etf", fund: "equity_fund", "mutual fund": "equity_fund", index: "index", etc: "etf" };
const REGION: Record<string, string> = { ng: "Africa", us: "North America", uk: "Europe", global: "Global" };
const COUNTRY: Record<string, string> = { ng: "NG", us: "US", uk: "GB", global: "GLOBAL" };

async function eodhdTask(): Promise<string> {
  const key = process.env.EODHD_API_KEY;
  if (!key) throw new Error("EODHD_API_KEY is not set: add it as an environment secret (never in the repository)");
  let budget = Number(FLAGS.budget ?? 20);
  const client0 = new EodhdClient(key, budget);
  const usage = await client0.usage().catch(() => null);
  if (usage) budget = Math.max(0, Math.min(budget, usage.limit - usage.used));
  const client = new EodhdClient(key, budget);
  const sourceId = await source("eodhd");
  const withFundamentals = FLAGS.fundamentals === "1";
  const symbolLists = new Map<string, Map<string, SymbolMeta>>();
  const listFor = async (exchange: string) => {
    if (!symbolLists.has(exchange)) {
      const rows = ((await client.get("symbols", `exchange-symbol-list/${exchange}`)) ?? []) as SymbolMeta[];
      symbolLists.set(exchange, new Map(rows.map((r) => [r.Code, r])));
    }
    return symbolLists.get(exchange)!;
  };

  let universe = FLAGS.symbols ? FLAGS.symbols.split(",").map((code) => ({ code: code.trim(), market: marketOfCode(code.trim()) })) : [...CURATED];
  if (!FLAGS.symbols && FLAGS.ng !== "0") {
    try {
      const ngx = await listFor("XNSA");
      universe = [...universe, ...[...ngx.values()].filter((r) => /common stock/i.test(r.Type)).map((r) => ({ code: `${r.Code}.XNSA`, market: "ng" as const }))];
    } catch (err) {
      if (err instanceof BudgetExhausted) return "budget exhausted before the NGX symbol list";
      console.warn(`  NGX symbol list unavailable: ${err instanceof Error ? err.message : err}`);
    }
  }

  const report = { created: 0, updated: 0, prices: 0, dividends: 0, splits: 0, fundamentals: 0, unknown: [] as string[], skippedFresh: 0 };
  for (const entry of universe) {
    try {
      const [ticker, exch] = [entry.code.slice(0, entry.code.lastIndexOf(".")), entry.code.slice(entry.code.lastIndexOf(".") + 1)];
      const idRow = await pool.query("select i.id, i.currency from instrument_identifiers x join instruments i on i.id = x.instrument_id where x.scheme = 'EODHD' and x.value = $1", [entry.code]);
      let instrumentId: string | undefined = idRow.rows[0]?.id;
      let currency: string = idRow.rows[0]?.currency;
      const last = instrumentId ? (await pool.query("select max(observed_on)::text as last, max(retrieved_at) as fetched from market_prices where instrument_id = $1 and source_id = $2", [instrumentId, sourceId])).rows[0] : null;
      if (last?.fetched && Date.now() - new Date(last.fetched).getTime() < 18 * 3600_000 && !FLAGS.force) {
        report.skippedFresh++;
        continue;
      }
      let fundamentals: ReturnType<typeof parseFundamentals> = null;
      const fundAge = instrumentId ? (await pool.query("select retrieved_at from instrument_fundamentals where instrument_id = $1", [instrumentId])).rows[0]?.retrieved_at : null;
      if (withFundamentals && (!fundAge || Date.now() - new Date(fundAge).getTime() > 7 * 86400_000) && client.remaining() >= 13) {
        fundamentals = parseFundamentals(await client.get("fundamentals", `fundamentals/${entry.code}`));
      }
      if (!instrumentId) {
        const meta = fundamentals ? null : (await listFor(exch === "US" ? "US" : exch)).get(ticker);
        if (!fundamentals && !meta) {
          report.unknown.push(entry.code);
          continue;
        }
        const name = fundamentals?.profile.name ?? meta!.Name;
        const type = (fundamentals?.profile.type ?? meta!.Type ?? "").toLowerCase();
        const rawCcy = fundamentals?.profile.currency ?? meta!.Currency ?? (exch === "XNSA" ? "NGN" : "USD");
        currency = normaliseCurrency("1", rawCcy).currency;
        const assetClass = ASSET_CLASS[type] ?? "other";
        const sectorKey = mapSector(fundamentals?.profile.sector ?? null, type) ?? (assetClass === "etf" ? "broad-market" : null);
        const r = await pool.query(
          `insert into instruments (symbol, name, issuer, asset_class, country, region, currency, pricing_model, stale_after_days, verification_state, verified_at, market, exchange, sector_key, benchmark_key)
           values ($1,$2,$3,$4,$5,$6,$7,'market',5,'verified',now(),$8,$9,$10,$11) returning id`,
          [ticker, name, name, assetClass, COUNTRY[entry.market], REGION[entry.market], currency, entry.market, meta?.Exchange ?? fundamentals?.profile.exchange ?? exch, sectorKey, (entry as { benchmarkKey?: string }).benchmarkKey ?? null],
        );
        instrumentId = r.rows[0].id as string;
        await pool.query("insert into instrument_identifiers (instrument_id, scheme, value, verification_state) values ($1,'EODHD',$2,'verified') on conflict do nothing", [instrumentId, entry.code]);
        const isin = fundamentals?.profile.isin ?? meta?.Isin;
        if (isin) await pool.query("insert into instrument_identifiers (instrument_id, scheme, value, verification_state) values ($1,'ISIN',$2,'verified') on conflict do nothing", [instrumentId, isin]);
        report.created++;
      } else report.updated++;
      if (fundamentals) {
        await pool.query(
          `insert into instrument_fundamentals (instrument_id, source_id, data) values ($1,$2,$3) on conflict (instrument_id) do update set data = excluded.data, source_id = excluded.source_id, retrieved_at = now()`,
          [instrumentId, sourceId, JSON.stringify(fundamentals)],
        );
        const sectorKey = mapSector(fundamentals.profile.sector, fundamentals.profile.type);
        if (sectorKey) await pool.query("update instruments set sector_key = $2 where id = $1 and sector_key is distinct from $2", [instrumentId, sectorKey]);
        report.fundamentals++;
      }
      const from = last?.last ? new Date(Date.parse(last.last) - 10 * 86400_000).toISOString().slice(0, 10) : "1990-01-01";
      const eod = parseEod(await client.get("eod", `eod/${entry.code}`, { from }), currency);
      await chunked(eod.rows, 1000, async (chunk) => {
        const values = chunk.map((_, j) => `('${instrumentId}','${sourceId}',$${j * 2 + 1}::date,$${j * 2 + 2}::numeric,'${eod.currency}','close','verified')`).join(",");
        await pool.query(
          `insert into market_prices (instrument_id, source_id, observed_on, price, currency, methodology, verification_state) values ${values}
           on conflict (instrument_id, source_id, observed_on) do update set price = excluded.price, retrieved_at = now() where market_prices.price <> excluded.price`,
          chunk.flatMap((p) => [p.date, p.close]),
        );
      });
      if (!eod.rows.length) await pool.query("update market_prices set retrieved_at = now() where instrument_id = $1 and source_id = $2 and observed_on = $3", [instrumentId, sourceId, last?.last ?? "1900-01-01"]);
      report.prices += eod.rows.length;
      const actionsFrom = last?.last ? new Date(Date.parse(last.last) - 60 * 86400_000).toISOString().slice(0, 10) : "1990-01-01";
      const divs = parseDividends(await client.get("div", `div/${entry.code}`, { from: actionsFrom }), currency);
      const splits = parseSplits(await client.get("splits", `splits/${entry.code}`, { from: actionsFrom }));
      for (const dv of divs.rows) {
        await pool.query(
          `insert into corporate_actions (instrument_id, kind, ex_date, pay_date, amount, currency, source_id, verification_state) values ($1,'cash_dividend',$2,$3,$4,$5,$6,'verified')
           on conflict on constraint corporate_actions_unique_obs do update set amount = excluded.amount, pay_date = excluded.pay_date, currency = excluded.currency, retrieved_at = now()`,
          [instrumentId, dv.exDate, dv.payDate, dv.amount, dv.currency, sourceId],
        );
      }
      for (const sp of splits.rows) {
        await pool.query(
          `insert into corporate_actions (instrument_id, kind, ex_date, ratio, source_id, verification_state) values ($1,'split',$2,$3,$4,'verified')
           on conflict on constraint corporate_actions_unique_obs do update set ratio = excluded.ratio, retrieved_at = now()`,
          [instrumentId, sp.exDate, sp.ratio, sourceId],
        );
      }
      report.dividends += divs.rows.length;
      report.splits += splits.rows.length;
    } catch (err) {
      if (err instanceof BudgetExhausted) break;
      console.warn(`  ${entry.code}: ${err instanceof Error ? err.message : err}`);
    }
  }
  const done = report.created + report.updated + report.skippedFresh;
  return `${done}/${universe.length} symbols (${report.created} new, ${report.updated} refreshed, ${report.skippedFresh} already fresh); ${report.prices} prices, ${report.dividends} dividends, ${report.splits} splits, ${report.fundamentals} fundamentals; ${client.calls}/${budget} API calls${report.unknown.length ? `; not found: ${report.unknown.join(", ")}` : ""}${done < universe.length ? " — budget reached; run again tomorrow to continue" : ""}`;
}
TASKS.eodhd = eodhdTask;

const ALL = ["cbn-fx", "cbn-inflation", "cbn-money-market", "cbn-auctions", "fed-funds", "boe-bank-rate", "ons-cpi", "bls-cpi"];
const requested = process.argv.slice(2).filter((a) => !a.startsWith("-"));
// --keep-going: a source that fails is reported and left out, and the run still succeeds as long as
// some data loaded (deploy builds: one unreachable source shouldn't block a release). With
// --gaps-file=PATH the failed sources are written there, one per line, for the deploy to report.
const keepGoing = process.argv.includes("--keep-going");
const gapsFile = process.argv.find((a) => a.startsWith("--gaps-file="))?.slice("--gaps-file=".length);
const gaps: string[] = [];
const tasks = requested.includes("all") || requested.length === 0 ? ALL : requested;
let failed = 0;
try {
  for (const t of tasks) {
    const fn = TASKS[t];
    if (!fn) {
      console.error(`unknown task ${t}; known: ${Object.keys(TASKS).join(", ")}`);
      failed++;
      gaps.push(`${t} (unknown task)`);
      continue;
    }
    const started = Date.now();
    try {
      console.log(`${t}: ${await fn()} [${((Date.now() - started) / 1000).toFixed(1)}s]`);
    } catch (err) {
      failed++;
      gaps.push(t);
      console.error(`${t}: FAILED — ${err instanceof Error ? err.message : String(err)}`);
    }
  }
} finally {
  await pool.end();
}
if (gapsFile) writeFileSync(gapsFile, gaps.map((g) => `${g}\n`).join(""));
if (failed) console.error(`Not loaded: ${gaps.join(", ")}${keepGoing && failed < tasks.length ? " (left out; the rest loaded)" : ""}`);
// Unknown task names are a mistake in the command, never a gap to carry on past.
const unknown = gaps.some((g) => g.endsWith("(unknown task)"));
process.exitCode = failed && (!keepGoing || unknown || failed === tasks.length) ? 1 : 0;
