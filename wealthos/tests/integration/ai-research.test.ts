import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { closeDb } from "@/server/db/client";
import { askAssistant } from "@/server/ai/assistant";
import { MockProvider, text, toolUse, type ChatRequest } from "@/server/ai/provider";
import { toolsFor } from "@/server/ai/tools";
import { clearMarketSnapshotCache } from "@/server/research/snapshot";
import { makeUser, ownerPool } from "./helpers";

// Test-only instruments and series (names say so) with deterministic month-end values.
let user: Awaited<ReturnType<typeof makeUser>>;
const tag = randomUUID().slice(0, 6);
const ids = { ng: "", us: "" };

function monthEnds(fromYear: number, toYear: number): string[] {
  const out: string[] = [];
  for (let y = fromYear; y <= toYear; y++) for (let m = 0; m < 12; m++) out.push(new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10));
  return out;
}

const toolNames = (r: ChatRequest) => r.tools.map((t) => t.name);
const results = (r: ChatRequest) =>
  r.messages.flatMap((m) => (m.role === "user" && Array.isArray(m.content) ? m.content : [])).filter((b) => b.type === "tool_result") as Array<{ content: string; is_error?: boolean }>;

beforeAll(async () => {
  user = await makeUser("Research asker");
  const pool = ownerPool();
  const src = (await pool.query("insert into market_data_sources (key, name, kind, license_note) values ($1, $2, 'official', 'Test only source') returning id", [`air-${tag}`, `AI research test ${tag}`])).rows[0].id as string;
  const inst = async (name: string, market: string, currency: string) =>
    (await pool.query(
      `insert into instruments (name, symbol, asset_class, country, region, currency, pricing_model, verification_state, market)
       values ($1, $2, 'etf', $3, 'Test', $4, 'market', 'verified', $5) returning id`,
      [name, `AIR${tag}${market}`, market === "ng" ? "NG" : "US", currency, market],
    )).rows[0].id as string;
  ids.ng = await inst(`TEST AIR naira fund ${tag}`, "ng", "NGN");
  ids.us = await inst(`TEST AIR dollar fund ${tag}`, "us", "USD");
  const dates = monthEnds(2015, 2024);
  const prices = (id: string, ccy: string, monthly: number) =>
    pool.query(
      `insert into market_prices (instrument_id, source_id, observed_on, price, currency, methodology, verification_state)
       select $1, $2, d::date, 100 * power($4::numeric, i - 1), $3, 'nav', 'verified' from unnest($5::text[]) with ordinality as t(d, i)`,
      [id, src, ccy, monthly, dates],
    );
  await prices(ids.ng, "NGN", 1.01);
  await prices(ids.us, "USD", 1.005);
  // Same date-derived USD/NGN formula as the other research tests, so shared dates agree.
  await pool.query(
    `insert into fx_rates (base, quote, rate, observed_on, source_id, methodology, verification_state)
     select 'USD', 'NGN', 400 * power(1.005::numeric, (extract(year from d::date)::int - 2000) * 12 + extract(month from d::date)::int - 1), d::date, $1, 'official', 'verified' from unnest($2::text[]) with ordinality as t(d, i)
     on conflict do nothing`,
    [src, dates],
  );
  for (const [key, value] of [["NG.MPR", 0.275], ["NG.CPI_YOY", 0.2]] as const) {
    const series = (await pool.query(
      `insert into macro_series (key, name, country, unit, frequency, description, source_id) values ($1, $2, 'NG', 'percent', 'monthly', 'Test series', $3)
       on conflict (key) do update set name = excluded.name returning id`,
      [key, `TEST ${key}`, src],
    )).rows[0].id;
    await pool.query(
      `insert into macro_observations (series_id, observed_on, value, source_id, verification_state)
       select $1, d::date, $2, $3, 'verified' from unnest($4::text[]) as t(d) on conflict do nothing`,
      [series, value, src, dates],
    );
  }
  await pool.end();
  clearMarketSnapshotCache();
});
afterAll(async () => closeDb());

describe("assistant research tools", () => {
  it("are offered only where their research feature is available", () => {
    const names = (f: { research: boolean; backtest: boolean }) => toolsFor(false, f).map((t) => t.definition.name);
    expect(names({ research: false, backtest: false })).not.toContain("get_market_snapshot");
    expect(names({ research: true, backtest: false })).toEqual(expect.arrayContaining(["get_market_snapshot", "get_macro_history", "get_fixed_income", "get_asset_class_returns", "screen_instruments", "compare_instruments"]));
    expect(names({ research: true, backtest: false })).not.toContain("run_backtest");
    expect(names({ research: false, backtest: true })).toContain("run_backtest");
    for (const t of toolsFor(true, { research: true, backtest: true })) expect(t.definition.strict).toBe(true);
  });

  it("answer from the research data, with percentages written out and sources attached", async () => {
    const p = new MockProvider([
      () => ({
        stopReason: "tool_use",
        content: [
          toolUse("a", "get_market_snapshot", {}),
          toolUse("b", "get_macro_history", { series: "nigeria_policy_rate", months: 3 }),
          toolUse("c", "find_research_instruments", { query: `AIR${tag}`, market: "any" }),
          toolUse("d", "get_instrument_performance", { instrument_id: ids.us, currency: "USD" }),
          toolUse("e", "compare_instruments", { instrument_ids: [ids.ng, ids.us], currency: "USD" }),
          toolUse("f", "screen_instruments", { currency: "USD", market: "any", query: `AIR${tag}`, min_5y_return_percent: "", max_volatility_percent: "", min_dividend_yield_percent: "", sort: "r5y", direction: "desc" }),
        ],
      }),
      () => ({ content: [text("Here is what the data shows.")] }),
    ]);
    const r = await askAssistant(user.ctx, { message: "How have rates and these funds done?", baseCurrency: "NGN" }, p);
    expect(toolNames(p.requests[0]!)).toEqual(expect.arrayContaining(["get_market_snapshot", "run_backtest"]));
    const [snap, hist, found, perf, cmp, screen] = results(p.requests[1]!).map((x) => {
      expect(x.is_error).toBeFalsy();
      return JSON.parse(x.content) as { data: Record<string, unknown> & unknown[] };
    });
    expect((snap!.data as Array<{ figure: string; value: string }>).find((t) => t.figure === "CBN policy rate")?.value).toBe("27.50%");
    expect((hist!.data as unknown as { monthly: Array<{ value: string }> }).monthly).toHaveLength(3);
    expect((found!.data as Array<{ id: string }>).map((x) => x.id).sort()).toEqual([ids.ng, ids.us].sort());
    // 0.5% a month in its own currency: (1.005^12 − 1) a year.
    const oneYear = ((perf!.data as unknown as { trailing: Array<{ window: string; aYear: string; total: string }> }).trailing).find((w) => w.window === "1Y")!;
    expect(oneYear.total).toBe(`${((1.005 ** 12 - 1) * 100).toFixed(2)}%`);
    expect((cmp!.data as unknown as { instruments: unknown[] }).instruments).toHaveLength(2);
    expect((screen!.data as unknown as { sortedBy: string; rows: Array<{ id: string }> }).sortedBy).toMatch(/^5 years/);
    expect(r.sources.length).toBeGreaterThan(0);
    expect(r.toolCalls.every((c) => c.ok)).toBe(true);
  });

  it("run backtests only on a mix the person gave, returning validation errors to the model", async () => {
    const good = { holdings: [{ instrument_id: ids.ng, weight_percent: "60" }, { instrument_id: ids.us, weight_percent: "40" }], currency: "NGN", starting_amount: "1000000", monthly_addition: "0", rebalance: "annually", start_year: "", benchmark_id: "" };
    const p = new MockProvider([
      () => ({ stopReason: "tool_use", content: [toolUse("g", "run_backtest", good), toolUse("h", "run_backtest", { ...good, holdings: [{ instrument_id: ids.ng, weight_percent: "70" }] })] }),
      () => ({ content: [text("That is a hypothetical illustration.")] }),
    ]);
    await askAssistant(user.ctx, { message: "Backtest 60% naira fund, 40% dollar fund", baseCurrency: "NGN" }, p);
    const [ok, bad] = results(p.requests[1]!);
    const data = JSON.parse(ok!.content) as { data: { holdings: Array<{ targetWeight: string }>; portfolio: { timeWeightedAYear: string } }; notes: string[] };
    expect(data.data.holdings.map((h) => h.targetWeight)).toEqual(["60.00%", "40.00%"]);
    expect(data.data.portfolio.timeWeightedAYear).toMatch(/%$/);
    expect(data.notes[0]).toMatch(/Hypothetical/);
    expect(bad).toMatchObject({ is_error: true });
    expect(bad!.content).toMatch(/add up to 100%/);
  });
});
