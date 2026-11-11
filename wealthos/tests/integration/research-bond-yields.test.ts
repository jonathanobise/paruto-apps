import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { closeDb } from "@/server/db/client";
import { getFixedIncome } from "@/server/research/markets";
import { clearMarketSnapshotCache, getMarketSnapshot } from "@/server/research/snapshot";
import { makeUser, ownerPool } from "./helpers";

// Test-only daily 10-year yields under the real series keys, from a test "licensed" source.
let user: Awaited<ReturnType<typeof makeUser>>;
const tag = randomUUID().slice(0, 6);

beforeAll(async () => {
  user = await makeUser("Bond yields");
  const pool = ownerPool();
  const src = (await pool.query("insert into market_data_sources (key, name, kind, license_note) values ($1, $2, 'licensed', 'Test only source') returning id", [`gb-${tag}`, `TEST bond yields ${tag}`])).rows[0].id as string;
  const series = async (key: string, country: string) =>
    (await pool.query(
      `insert into macro_series (key, name, country, unit, frequency, description, source_id) values ($1, $2, $3, 'percent', 'daily', 'Test only', $4)
       on conflict (key) do update set source_id = excluded.source_id returning id`,
      [key, `TEST ${key}`, country, src],
    )).rows[0].id as string;
  const ng = await series("NG.GB10Y", "NG");
  const us = await series("US.GB10Y", "US");
  const obs = (id: string, rows: Array<[string, string]>) =>
    pool.query(
      `insert into macro_observations (series_id, observed_on, value, source_id, verification_state)
       select $1, d::date, v::numeric, $2, 'verified' from unnest($3::text[], $4::text[]) as t(d, v) on conflict do nothing`,
      [id, src, rows.map((r) => r[0]), rows.map((r) => r[1])],
    );
  await obs(ng, [["2025-11-07", "0.1950"], ["2025-11-10", "0.1960"], ["2026-10-30", "0.1700"], ["2026-11-10", "0.1642"]]);
  await obs(us, [["2025-11-10", "0.0410"], ["2026-11-10", "0.0405"]]);
  await pool.end();
});
afterAll(async () => closeDb());

describe("10-year government bond yields (licensed)", () => {
  it("shows the latest market yield with the level a year earlier and an approximate real yield", async () => {
    const f = await getFixedIncome(user.ctx);
    expect(f.licensedHidden).toBe(false);
    const ng = f.marketYields!.latest.find((y) => y.country === "NG")!;
    expect(ng).toMatchObject({ value: "0.1642", asOf: "2026-11-10", yearAgo: "0.196" });
    expect(f.marketYields!.latest.find((y) => y.country === "US")!.realApprox).toBeNull();
    const nov = f.marketYields!.chart.find((r) => r.month === "2026-11")!;
    expect(nov.ng).toBeCloseTo(0.1642, 6);
    expect(nov.us).toBeCloseTo(0.0405, 6);
    expect(f.marketYields!.chart.find((r) => r.month === "2026-10")!.ng).toBeCloseTo(0.17, 6);
  });

  it("puts the FGN 10-year yield on the market snapshot", async () => {
    clearMarketSnapshotCache();
    const snap = await getMarketSnapshot(user.ctx);
    expect(snap.tiles.find((t) => t.key === "NG.GB10Y")).toMatchObject({ value: "0.1642", asOf: "2026-11-10", href: "/research/fixed-income" });
    clearMarketSnapshotCache();
  });

  it("never shows them in the public demo", async () => {
    process.env.DEMO_MODE = "1";
    try {
      const f = await getFixedIncome(user.ctx);
      expect(f.marketYields).toBeNull();
      expect(f.licensedHidden).toBe(true);
      clearMarketSnapshotCache();
      const snap = await getMarketSnapshot(user.ctx);
      expect(snap.tiles.some((t) => t.key === "NG.GB10Y")).toBe(false);
    } finally {
      delete process.env.DEMO_MODE;
      clearMarketSnapshotCache();
    }
  });
});
