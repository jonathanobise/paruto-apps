import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { closeDb } from "@/server/db/client";
import { compareMarkets, runScreener } from "@/server/research/screener";
import { makeUser, ownerPool } from "./helpers";

// Test-only instruments (names say so) with deterministic month-end prices in the test database.
let user: Awaited<ReturnType<typeof makeUser>>;
const ids = { ng: "", us: "", lic: "" };
const tag = randomUUID().slice(0, 6);

function monthEnds(fromYear: number, toYear: number): string[] {
  const out: string[] = [];
  for (let y = fromYear; y <= toYear; y++) for (let m = 0; m < 12; m++) out.push(new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10));
  return out;
}

beforeAll(async () => {
  user = await makeUser("Screener");
  const pool = ownerPool();
  const src = async (kind: string) => (await pool.query("insert into market_data_sources (key, name, kind, license_note) values ($1, $2, $3, 'Test only source') returning id", [`scr-${kind}-${tag}`, `Screener test ${kind}`, kind])).rows[0].id as string;
  const official = await src("official");
  const licensed = await src("licensed");
  const inst = async (name: string, symbol: string, market: string, currency: string, assetClass: string, sector: string | null) =>
    (await pool.query(
      `insert into instruments (name, symbol, asset_class, country, region, currency, pricing_model, verification_state, market, sector_key)
       values ($1, $2, $3, $4, $5, $6, 'market', 'verified', $7, $8) returning id`,
      [name, symbol, assetClass, market === "ng" ? "NG" : "US", market === "ng" ? "Africa" : "North America", currency, market, sector],
    )).rows[0].id as string;
  ids.ng = await inst(`TEST Nigerian bank ${tag}`, `TNGB${tag}`, "ng", "NGN", "equity", "financials");
  ids.us = await inst(`TEST US index fund ${tag}`, `TUSF${tag}`, "us", "USD", "etf", "broad-market");
  ids.lic = await inst(`TEST licensed-only stock ${tag}`, `TLIC${tag}`, "us", "USD", "equity", "technology");
  const dates = monthEnds(2016, 2025);
  const prices = (id: string, sourceId: string, ccy: string, start: number, monthly: number) =>
    pool.query(
      `insert into market_prices (instrument_id, source_id, observed_on, price, currency, methodology, verification_state)
       select $1, $2, d::date, $4::numeric * power($5::numeric, i - 1), $3, 'close', 'verified' from unnest($6::text[]) with ordinality as t(d, i)`,
      [id, sourceId, ccy, start, monthly, dates],
    );
  await prices(ids.ng, official, "NGN", 10, 1.01); // +1% a month in naira
  await prices(ids.us, official, "USD", 100, 1.005); // +0.5% a month in dollars
  await prices(ids.lic, licensed, "USD", 50, 1.02);
  // The naira weakens 0.5% a month against the dollar (official rates). The rate is a function of the
  // date, so rows other test files insert for the same dates agree with these.
  await pool.query(
    `insert into fx_rates (base, quote, rate, observed_on, source_id, methodology, verification_state)
     select 'USD', 'NGN', 400 * power(1.005::numeric, (extract(year from d::date)::int - 2000) * 12 + extract(month from d::date)::int - 1), d::date, $1, 'official', 'verified' from unnest($2::text[]) with ordinality as t(d, i)
     on conflict do nothing`,
    [official, dates],
  );
  await pool.end();
});
afterAll(async () => closeDb());

const mine = <T extends { id: string }>(rows: T[]) => rows.filter((r) => Object.values(ids).includes(r.id));

describe("screener", () => {
  it("lists research instruments with long-run figures in their own currency", async () => {
    const res = await runScreener(user.ctx, { lens: "local", q: tag });
    const rows = mine(res.rows);
    expect(rows.map((r) => r.id).sort()).toEqual(Object.values(ids).sort());
    const ng = rows.find((r) => r.id === ids.ng)!;
    // 1.01^12 − 1 = 12.68% a year, whatever the window.
    expect(Number(ng.r5y)).toBeCloseTo(0.1268, 3);
    expect(Number(ng.r10y ?? "NaN")).toBeNaN(); // 2016–2025 is under ten full years of month ends
    expect(ng.sector).toBe("Financials");
  });

  it("applies thresholds and never lets an unknown figure pass", async () => {
    const min = await runScreener(user.ctx, { lens: "local", q: tag, min5y: "10" });
    expect(mine(min.rows).map((r) => r.id).sort()).toEqual([ids.ng, ids.lic].sort());
    const pe = await runScreener(user.ctx, { lens: "local", q: tag, maxPe: "50" });
    expect(mine(pe.rows)).toHaveLength(0); // no fundamentals → no P/E → excluded
    const bad = await runScreener(user.ctx, { lens: "local", q: tag, maxVol: "lots" });
    expect(bad.invalid).toEqual(["Maximum volatility"]);
  });

  it("sorts either way with unknowns last, and filters by market", async () => {
    const desc = await runScreener(user.ctx, { lens: "local", q: tag, sort: "r5y", dir: "desc" });
    expect(mine(desc.rows).map((r) => r.id)).toEqual([ids.lic, ids.ng, ids.us]);
    const asc = await runScreener(user.ctx, { lens: "local", q: tag, sort: "r5y", dir: "asc" });
    expect(mine(asc.rows).map((r) => r.id)).toEqual([ids.us, ids.ng, ids.lic]);
    const us = await runScreener(user.ctx, { lens: "local", q: tag, market: "us" });
    expect(mine(us.rows).map((r) => r.id).sort()).toEqual([ids.us, ids.lic].sort());
  });

  it("converts to one currency at same-day official rates", async () => {
    const res = await runScreener(user.ctx, { lens: "USD", q: tag });
    const ng = mine(res.rows).find((r) => r.id === ids.ng)!;
    // (1.01 / 1.005)^12 − 1
    expect(Number(ng.r5y)).toBeCloseTo((1.01 / 1.005) ** 12 - 1, 3);
  });

  it("never shows licensed data in the public demo", async () => {
    process.env.DEMO_MODE = "1";
    try {
      const res = await runScreener(user.ctx, { lens: "local", q: tag });
      expect(mine(res.rows).map((r) => r.id).sort()).toEqual([ids.ng, ids.us].sort());
      const cmp = await compareMarkets(user.ctx, [ids.ng, ids.lic], "USD");
      expect(cmp.items.map((i) => i.id)).toEqual([ids.ng]);
    } finally {
      delete process.env.DEMO_MODE;
    }
  });
});

describe("cross-market compare", () => {
  it("rebases over the common period in the chosen currency", async () => {
    const cmp = await compareMarkets(user.ctx, [ids.ng, ids.us], "USD");
    expect(cmp.items.map((i) => i.id)).toEqual([ids.ng, ids.us]);
    expect(cmp.common).not.toBeNull();
    expect(cmp.common!.startMonth).toBe("2016-01");
    expect(cmp.common!.chart[0]).toMatchObject({ s0: 100, s1: 100 });
    expect(Number(cmp.common!.stats[1]!.annualized)).toBeCloseTo(1.005 ** 12 - 1, 3);
    expect(Number(cmp.common!.stats[0]!.annualized)).toBeCloseTo((1.01 / 1.005) ** 12 - 1, 3);
    expect(cmp.calendar[0]!.values).toHaveLength(2);
  });

  it("ignores unknown ids, caps at three and needs a single currency", async () => {
    const cmp = await compareMarkets(user.ctx, [randomUUID(), ids.ng, "not-an-id", ids.us, ids.lic, ids.ng], "NGN");
    expect(cmp.items.map((i) => i.id)).toEqual([ids.ng, ids.us]);
    await expect(compareMarkets(user.ctx, [ids.ng, ids.us], "local")).rejects.toMatchObject({ code: "VALIDATION" });
  });
});
