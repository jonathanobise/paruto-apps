import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { closeDb } from "@/server/db/client";
import { backtest, type BacktestView } from "@/server/research/backtest";
import { makeUser, ownerPool } from "./helpers";

// Test-only instruments (names say so) with deterministic month-end series in the test database.
let user: Awaited<ReturnType<typeof makeUser>>;
const ids = { ng: "", us: "", lic: "" };
const tag = randomUUID().slice(0, 6);

function monthEnds(fromYear: number, toYear: number): string[] {
  const out: string[] = [];
  for (let y = fromYear; y <= toYear; y++) for (let m = 0; m < 12; m++) out.push(new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10));
  return out;
}

beforeAll(async () => {
  user = await makeUser("Backtester");
  const pool = ownerPool();
  const src = async (kind: string) => (await pool.query("insert into market_data_sources (key, name, kind, license_note) values ($1, $2, $3, 'Test only source') returning id", [`bt-${kind}-${tag}`, `Backtest test ${kind}`, kind])).rows[0].id as string;
  const official = await src("official");
  const licensed = await src("licensed");
  const inst = async (name: string, market: string, currency: string) =>
    (await pool.query(
      `insert into instruments (name, symbol, asset_class, country, region, currency, pricing_model, verification_state, market)
       values ($1, $2, 'etf', $3, 'Test', $4, 'market', 'verified', $5) returning id`,
      [name, `T${tag}${market}`, market === "ng" ? "NG" : "US", currency, market],
    )).rows[0].id as string;
  ids.ng = await inst(`TEST naira fund ${tag}`, "ng", "NGN");
  ids.us = await inst(`TEST dollar fund ${tag}`, "us", "USD");
  ids.lic = await inst(`TEST licensed fund ${tag}`, "global", "USD");
  const dates = monthEnds(2015, 2024);
  const prices = (id: string, sourceId: string, ccy: string, monthly: number) =>
    pool.query(
      `insert into market_prices (instrument_id, source_id, observed_on, price, currency, methodology, verification_state)
       select $1, $2, d::date, 100 * power($4::numeric, i - 1), $3, 'nav', 'verified' from unnest($5::text[]) with ordinality as t(d, i)`,
      [id, sourceId, ccy, monthly, dates],
    );
  await prices(ids.ng, official, "NGN", 1.01);
  await prices(ids.us, official, "USD", 1.005);
  await prices(ids.lic, licensed, "USD", 1.003);
  // USD/NGN as a function of the date (shared with other test files that insert the same dates).
  await pool.query(
    `insert into fx_rates (base, quote, rate, observed_on, source_id, methodology, verification_state)
     select 'USD', 'NGN', 400 * power(1.005::numeric, (extract(year from d::date)::int - 2000) * 12 + extract(month from d::date)::int - 1), d::date, $1, 'official', 'verified' from unnest($2::text[]) with ordinality as t(d, i)
     on conflict do nothing`,
    [official, dates],
  );
  // A US price index rising 0.2% a month, for the inflation-adjusted figure.
  const series = (await pool.query(
    `insert into macro_series (key, name, country, unit, frequency, description, source_id) values ('US.CPI', 'TEST US CPI', 'US', 'index', 'monthly', 'Test index', $1)
     on conflict (key) do update set name = excluded.name returning id`,
    [official],
  )).rows[0].id;
  await pool.query(
    `insert into macro_observations (series_id, observed_on, value, source_id, verification_state)
     select $1, d::date, 100 * power(1.002::numeric, i - 1), $2, 'verified' from unnest($3::text[]) with ordinality as t(d, i)
     on conflict do nothing`,
    [series, official, dates],
  );
  await pool.end();
});
afterAll(async () => closeDb());

const base = { lens: "USD" as const, initial: "1000", contribution: "0", rebalance: "monthly" as const };

describe("backtest service", () => {
  it("validates the mix before touching data", async () => {
    const bad = await backtest(user.ctx, { ...base, holdings: [{ id: ids.ng, weight: "60" }, { id: ids.us, weight: "30" }] });
    expect(bad).toMatchObject({ ok: false, errors: ["Weights must add up to 100%."] });
    const dup = await backtest(user.ctx, { ...base, holdings: [{ id: ids.ng, weight: "50" }, { id: ids.ng, weight: "50" }] });
    expect(dup.ok).toBe(false);
    const unknown = await backtest(user.ctx, { ...base, holdings: [{ id: randomUUID(), weight: "100" }] });
    expect(unknown).toMatchObject({ ok: false });
    const nothing = await backtest(user.ctx, { ...base, initial: "0", holdings: [{ id: ids.us, weight: "100" }] });
    expect(nothing).toMatchObject({ ok: false, errors: ["Enter a starting amount or a monthly contribution."] });
  });

  it("converts to one currency, rebalances, and compares with a benchmark", async () => {
    const r = (await backtest(user.ctx, { ...base, holdings: [{ id: ids.ng, weight: "50" }, { id: ids.us, weight: "50" }], benchmarkId: ids.us })) as BacktestView;
    expect(r.ok).toBe(true);
    expect(r.startMonth).toBe("2015-01");
    expect(r.endMonth).toBe("2024-12");
    // In dollars the naira fund grows 1.01/1.005 a month; rebalanced monthly 50/50:
    const monthly = 0.5 * (1.01 / 1.005 - 1) + 0.5 * 0.005;
    expect(Number(r.portfolio.twrAnnualized)).toBeCloseTo((1 + monthly) ** 12 - 1, 6);
    expect(Number(r.benchmark!.twrAnnualized)).toBeCloseTo(1.005 ** 12 - 1, 6);
    // Real: deflated by the 0.2%-a-month index over the whole span.
    expect(Number(r.portfolio.real!.annualized)).toBeCloseTo(((1 + monthly) / 1.002) ** 12 - 1, 6);
    expect(r.holdings.map((h) => h.target)).toEqual(["0.5", "0.5"]);
    expect(r.chart).toHaveLength(120);
    expect(r.chart[0]).toMatchObject({ portfolio: 1000, benchmark: 1000, invested: 1000 });
  });

  it("adds contributions and lets weights drift when not rebalanced", async () => {
    const r = (await backtest(user.ctx, { ...base, contribution: "100", rebalance: "none", startYear: "2020", holdings: [{ id: ids.ng, weight: "50" }, { id: ids.us, weight: "50" }] })) as BacktestView;
    expect(r.startMonth).toBe("2020-01");
    expect(r.portfolio.totalInvested).toBe((1000 + 59 * 100).toFixed(2)); // 60 month ends, 59 contributions
    // In dollars the dollar fund (0.5% a month) outgrows the naira fund (1.01 / 1.005 ≈ 0.4975%), so it drifts above target.
    expect(Number(r.holdings[1]!.end)).toBeGreaterThan(0.5);
    expect(r.portfolio.moneyWeighted).not.toBeNull();
  });

  it("refuses licensed data in the public demo", async () => {
    process.env.DEMO_MODE = "1";
    try {
      const r = await backtest(user.ctx, { ...base, holdings: [{ id: ids.lic, weight: "100" }] });
      expect(r).toMatchObject({ ok: false, errors: ["One of the chosen instruments isn't available for research."] });
    } finally {
      delete process.env.DEMO_MODE;
    }
    const allowed = await backtest(user.ctx, { ...base, holdings: [{ id: ids.lic, weight: "100" }] });
    expect(allowed.ok).toBe(true);
  });
});
