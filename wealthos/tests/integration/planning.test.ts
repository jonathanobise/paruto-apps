import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb } from "@/server/db/client";
import { createAccount } from "@/server/accounts/service";
import { postEvent } from "@/server/ledger/service";
import { archiveGoal, getGoalView, listGoals, saveGoal } from "@/server/planning/goals";
import { stressTests } from "@/server/planning/stress";
import { deleteModel, listModels, saveModel, driftAgainstModel } from "@/server/models/service";
import { buildDashboard } from "@/server/analytics/portfolio";
import { d, project } from "@/engine";
import { makeUser } from "./helpers";

let user: Awaited<ReturnType<typeof makeUser>>;
let savings: string;

const goalInput = (over: Record<string, unknown> = {}) => ({
  name: "House deposit",
  kind: "home",
  targetAmount: "10,000,000",
  currency: "NGN",
  targetDate: `${new Date().getUTCFullYear() + 3}-01-31`,
  targetIsReal: false,
  scope: "accounts",
  accountIds: [savings],
  monthlyContribution: "150000",
  contributionTiming: "end",
  contributionGrowthPct: "0",
  inflationPct: "20",
  annualFeePct: "0",
  scenarios: [
    { label: "Low", annualReturnPct: "10" },
    { label: "Base", annualReturnPct: "15" },
    { label: "High", annualReturnPct: "20" },
  ],
  ...over,
});

beforeAll(async () => {
  user = await makeUser("Planner");
  savings = (await createAccount(user.ctx, { name: "Savings", type: "bank", currency: "NGN" })).id;
  await (createAccount(user.ctx, { name: "Flat", type: "real_estate", currency: "NGN", openingValue: "20000000", openingValueDate: "2025-01-01" }));
  await postEvent(user.ctx, { type: "deposit", accountId: savings, currency: "NGN", amount: "2000000", occurredOn: "2025-01-02" });
});
afterAll(async () => closeDb());

describe("goals", () => {
  it("refuses a single scenario and other invalid input", async () => {
    await expect(saveGoal(user.ctx, null, goalInput({ scenarios: [{ label: "Only", annualReturnPct: "15" }] }))).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(saveGoal(user.ctx, null, goalInput({ targetDate: "2020-01-01" }))).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(saveGoal(user.ctx, null, goalInput({ accountIds: [] }))).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("projects from the linked accounts' current value under every scenario", async () => {
    const id = await saveGoal(user.ctx, null, goalInput());
    const v = await getGoalView(user.ctx, id);
    expect(v.current).toBe("2000000.00"); // only the linked savings account, not the flat
    expect(v.progress).toBe("0.200000");
    expect(v.scenarios).toHaveLength(3);
    // Independent check against the engine for the base scenario.
    const base = project({ startingBalance: d(2_000_000), contributionPerPeriod: d(150_000), contributionGrowthAnnual: d(0), annualReturn: d("0.15"), annualFee: d(0), annualInflation: d("0.2"), periodsPerYear: 12, years: 0, horizonPeriods: v.months, timing: "end", taxesModelled: false });
    expect(v.scenarios[1]!.finalNominal).toBe(base.finalNominal.toFixed(2));
    // Required level contribution reaches exactly the target in each scenario.
    for (const s of v.scenarios) {
      const check = project({ startingBalance: d(2_000_000), contributionPerPeriod: d(s.requiredMonthly), contributionGrowthAnnual: d(0), annualReturn: d(s.annualReturn), annualFee: d(0), annualInflation: d("0.2"), periodsPerYear: 12, years: 0, horizonPeriods: v.months, timing: "end", taxesModelled: false });
      expect(check.finalNominal.minus(10_000_000).abs().lt("1")).toBe(true);
    }
    expect(v.disclosures.join(" ")).toMatch(/not guaranteed/);
  });

  it("inflates a target in today's money to the target date", async () => {
    const id = await saveGoal(user.ctx, null, goalInput({ name: "Real target", targetIsReal: true, scope: "net_worth", accountIds: [] }));
    const v = await getGoalView(user.ctx, id);
    expect(v.current).toBe("22000000.00");
    expect(d(v.targetNominal).toFixed(2)).toBe(d(10_000_000).times(d("1.2").pow(d(v.months).div(12))).toFixed(2));
    await archiveGoal(user.ctx, id);
    expect((await listGoals(user.ctx)).map((g) => g.name)).not.toContain("Real target");
  });

  it("is invisible to other tenants", async () => {
    const other = await makeUser("Snoop");
    expect(await listGoals(other.ctx)).toHaveLength(0);
    const [g] = await listGoals(user.ctx);
    await expect(getGoalView(other.ctx, g!.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("stress tests", () => {
  it("applies documented shocks to current exposures", async () => {
    const r = await stressTests(user.ctx, "NGN");
    const property = r.results.find((x) => x.id === "property-20")!;
    expect(property.netWorthBefore).toBe("22000000.00");
    expect(property.change).toBe("-4000000.00");
    const ngn = r.results.find((x) => x.id === "ngn-30")!;
    expect(ngn.change).toBe("0.00"); // all-naira portfolio: nothing foreign to revalue
  });
});

describe("target mixes", () => {
  it("requires weights to total exactly 100% and computes drift", async () => {
    await expect(saveModel(user.ctx, null, { name: "Bad", weights: { ng_tbills: "60", global_equity: "30" } })).rejects.toMatchObject({ code: "VALIDATION" });
    const id = await saveModel(user.ctx, null, { name: "Simple", weights: { ng_tbills: "60", global_equity: "40", unknown_bucket: "10" } });
    const [m] = (await listModels(user.ctx)).filter((x) => x.id === id);
    expect(Object.keys(m!.targets)).toEqual(["ng_tbills", "global_equity"]);
    const drift = driftAgainstModel(m!.targets, await buildDashboard(user.ctx, { baseCurrency: "NGN", period: "1M" }), true);
    expect(drift.rows.find((r) => r.key === "cash")!.currentWeight.toFixed()).toBe("1");
    await deleteModel(user.ctx, id);
    expect((await listModels(user.ctx)).some((x) => x.id === id)).toBe(false);
  });
});
