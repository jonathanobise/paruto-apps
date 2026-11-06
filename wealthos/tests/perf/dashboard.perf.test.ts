/**
 * Performance check (not part of `npm test`; run with `npm run test:perf`). Builds a large,
 * realistic ledger through the CSV import and times the analytics. Prints timings.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb } from "@/server/db/client";
import { createAccount } from "@/server/accounts/service";
import { commitImport, previewImport } from "@/server/imports/service";
import { buildDashboard } from "@/server/analytics/portfolio";
import { holdingsPerformance } from "@/server/analytics/performance";
import { addDays } from "@/engine";
import { makeUser, ownerPool } from "../integration/helpers";

const START = "2021-11-01";
const END = "2026-10-30";
const SYMBOLS = ["PA", "PB", "PC", "PD", "PE", "PF", "PG", "PH", "PI", "PJ"];
let user: Awaited<ReturnType<typeof makeUser>>;
const timings: Record<string, number> = {};

async function time<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const t = performance.now();
  const r = await fn();
  timings[label] = Math.round(performance.now() - t);
  return r;
}

beforeAll(async () => {
  const pool = ownerPool();
  const src = (await pool.query("insert into market_data_sources (key, name, kind, license_note) values ('perf', 'Perf fixtures', 'synthetic', 'Test only') on conflict (key) do update set name = excluded.name returning id")).rows[0].id;
  for (const [i, sym] of SYMBOLS.entries()) {
    const id = (await pool.query("insert into instruments (name, symbol, asset_class, country, region, currency, pricing_model, stale_after_days, verification_state) values ($1,$1,'equity','NG','Africa','NGN','market',5,'synthetic') on conflict do nothing returning id", [sym])).rows[0]?.id;
    if (!id) continue;
    const vals: string[] = [];
    const params: unknown[] = [id, src];
    let p = 10 + i;
    for (let dt = START; dt <= END; dt = addDays(dt, 1)) {
      const dow = new Date(`${dt}T00:00:00Z`).getUTCDay();
      if (dow === 0 || dow === 6) continue;
      p = p * (1 + Math.sin(vals.length / 17 + i) * 0.004 + 0.0003);
      params.push(dt, p.toFixed(4));
      vals.push(`($1,$2,$${params.length - 1},$${params.length},'NGN','close','synthetic')`);
    }
    for (let k = 0; k < vals.length; k += 400) {
      const chunk = vals.slice(k, k + 400);
      const offset = 2 + k * 2;
      const local = [id, src, ...params.slice(offset, offset + chunk.length * 2)];
      const sqlVals = chunk.map((_, j) => `($1,$2,$${j * 2 + 3},$${j * 2 + 4},'NGN','close','synthetic')`).join(",");
      await pool.query(`insert into market_prices (instrument_id, source_id, observed_on, price, currency, methodology, verification_state) values ${sqlVals} on conflict do nothing`, local);
    }
  }
  await pool.end();
  user = await makeUser("Perf");
}, 120_000);
afterAll(async () => {
  const { mkdirSync, writeFileSync } = await import("node:fs");
  mkdirSync("test-results", { recursive: true });
  writeFileSync("test-results/perf.json", JSON.stringify(timings, null, 2));
  await closeDb();
});

describe("large ledger", () => {
  it("imports ~2,400 transactions and builds analytics within budget", async () => {
    const acc = (await createAccount(user.ctx, { name: "Big broker", type: "brokerage", currency: "NGN" })).id;
    const rows = ["date,type,symbol,quantity,price,amount"];
    let n = 0;
    for (let dt = START; dt <= END && n < 2400; dt = addDays(dt, 1)) {
      const dow = new Date(`${dt}T00:00:00Z`).getUTCDay();
      if (dow === 0 || dow === 6) continue;
      if (n % 4 === 0) rows.push(`${dt},deposit,,,,50000`);
      else rows.push(`${dt},buy,${SYMBOLS[n % SYMBOLS.length]},10,9,`);
      n++;
    }
    const bytes = new TextEncoder().encode(rows.join("\n"));
    const id = await time("import preview (2,400 rows)", () => previewImport(user.ctx, { accountId: acc, fileName: "big.csv", bytes }));
    const r = await time("import commit", () => commitImport(user.ctx, id, { includeDuplicates: false }));
    expect(r.imported).toBe(rows.length - 1);
    const dash = await time("dashboard (cold)", () => buildDashboard(user.ctx, { baseCurrency: "NGN", period: "1Y" }));
    expect(dash.holdings).toHaveLength(SYMBOLS.length);
    await time("dashboard (repeat)", () => buildDashboard(user.ctx, { baseCurrency: "NGN", period: "1Y" }));
    await time("dashboard (uncached recompute)", () => buildDashboard(user.ctx, { baseCurrency: "NGN", period: "1Y", bypassCache: true }));
    await time("holdings performance (cold)", () => holdingsPerformance(user.ctx, { baseCurrency: "NGN", period: "ALL" }));
    await time("holdings performance (cached)", () => holdingsPerformance(user.ctx, { baseCurrency: "NGN", period: "ALL" }));
    // Budgets: generous enough for CI machines, tight enough to catch regressions.
    expect(timings["dashboard (cold)"]!).toBeLessThan(5000);
    expect(timings["dashboard (repeat)"]!).toBeLessThan(250);
  }, 600_000);
});
