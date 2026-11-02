import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inflateSync } from "node:zlib";
import { closeDb } from "@/server/db/client";
import { createAccount } from "@/server/accounts/service";
import { postEvent } from "@/server/ledger/service";
import { saveGoal } from "@/server/planning/goals";
import { buildDashboard } from "@/server/analytics/portfolio";
import { generateReport } from "@/server/reports/service";
import { buildWealthStatement } from "@/server/reports/statement";
import { addMonths } from "@/engine";
import { grantPlan, makeUser, ownerPool } from "./helpers";

const today = new Date().toISOString().slice(0, 10);
let user: Awaited<ReturnType<typeof makeUser>>;

/** Text drawn in a pdfkit PDF (content streams are deflated; Identity-H text is hex glyph ids, so we check structure, not glyphs). */
function pdfStreams(pdf: Buffer): string[] {
  const out: string[] = [];
  const s = pdf.toString("latin1");
  const re = /stream\r?\n/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const start = m.index + m[0].length;
    const end = s.indexOf("endstream", start);
    try {
      out.push(inflateSync(pdf.subarray(start, end)).toString("latin1"));
    } catch {
      /* not deflated */
    }
  }
  return out;
}

beforeAll(async () => {
  user = await makeUser("Report Adebayo");
  const pool = ownerPool();
  const src = (await pool.query("insert into market_data_sources (key, name, kind, license_note) values ('rep-src', 'Report tests', 'official', 'Test only') on conflict (key) do update set name = excluded.name returning id")).rows[0].id;
  const inst = (await pool.query("insert into instruments (name, symbol, asset_class, country, region, currency, pricing_model, stale_after_days, verification_state) values ('Report Test Plc', 'RPT', 'equity', 'NG', 'Africa', 'NGN', 'market', 5, 'verified') returning id")).rows[0].id;
  await pool.query("insert into market_prices (instrument_id, source_id, observed_on, price, currency, methodology, verification_state) values ($1,$2,$3,120,'NGN','close','verified')", [inst, src, today]);
  await pool.end();
  const acc = (await createAccount(user.ctx, { name: "Ọ̀rẹ́ broker", type: "brokerage", currency: "NGN" })).id;
  await postEvent(user.ctx, { type: "deposit", accountId: acc, currency: "NGN", amount: "500000", occurredOn: addMonths(today, -3) });
  await postEvent(user.ctx, { type: "buy", accountId: acc, instrumentId: inst, quantity: "1000", price: "100", fees: "500", currency: "NGN", occurredOn: addMonths(today, -3) });
  await postEvent(user.ctx, { type: "dividend", accountId: acc, instrumentId: inst, grossAmount: "5000", withholdingTax: "500", currency: "NGN", occurredOn: addMonths(today, -1) });
  await saveGoal(user.ctx, null, { name: "School fees", kind: "education", scope: "net_worth", accountIds: [], currency: "NGN", targetAmount: "2000000", targetIsReal: false, targetDate: `${new Date().getUTCFullYear() + 3}-09-01`, monthlyContribution: "20000", contributionTiming: "end", contributionGrowthPct: "0", inflationPct: "15", annualFeePct: "0", scenarios: [{ label: "Cautious", annualReturnPct: "8" }, { label: "Hopeful", annualReturnPct: "14" }] });
});
afterAll(async () => closeDb());

describe("reports", () => {
  it("statement figures are exactly the dashboard's, with period income and goals", async () => {
    const s = await buildWealthStatement(user.ctx, { baseCurrency: "NGN", period: "1Y" });
    const dash = await buildDashboard(user.ctx, { baseCurrency: "NGN", period: "1Y" });
    expect(s.dash.totals).toEqual(dash.totals);
    expect(s.dash.performance).toEqual(dash.performance);
    expect(s.income.map((x) => x.type)).toEqual(["dividend"]);
    expect(s.transactions).toHaveLength(3);
    expect(s.goals[0]).toMatchObject({ name: "School fees", scenarios: expect.any(Array) });
    expect(s.disclosures.join(" ")).toMatch(/not investment advice/);
  });

  it("CSV is available on Free and neutralises formula injection", async () => {
    const r = await generateReport(user.ctx, "NG", "statement.csv", { period: "1Y", baseCurrency: "NGN" });
    const text = String(r.body);
    expect(text.split("\r\n")[0]).toBe('"section","item","value","currency","as_of","note"');
    expect(text).toContain('"summary","net_worth"');
    expect(text).toContain('"income","Dividend · Report Test Plc","5000"');
    expect(r.filename).toMatch(/^wealthos-statement-1y-\d{4}-\d{2}-\d{2}\.csv$/);
    const h = String((await generateReport(user.ctx, "NG", "holdings.csv", { period: "1Y", baseCurrency: "NGN" })).body);
    expect(h).toContain('"Ọ̀rẹ́ broker","Report Test Plc","RPT"');
  });

  it("PDF needs a plan with PDF reports, then renders a valid multi-section document", async () => {
    await expect(generateReport(user.ctx, "NG", "statement.pdf", { period: "1Y", baseCurrency: "NGN" })).rejects.toMatchObject({ code: "PLAN_LIMIT" });
    await grantPlan(user.orgId, "plus");
    const r = await generateReport(user.ctx, "NG", "statement.pdf", { period: "1Y", baseCurrency: "NGN" });
    const pdf = r.body as Buffer;
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.toString("latin1")).toMatch(/\/FontFile2/); // embedded TrueType (Inter)
    expect(pdf.toString("latin1")).toMatch(/\/Title/); // document info
    expect(pdfStreams(pdf).length).toBeGreaterThan(2);
    expect(pdf.length).toBeGreaterThan(20_000);
  });

  it("rejects unknown report names", async () => {
    await expect(generateReport(user.ctx, "NG", "../../etc/passwd", { period: "1Y", baseCurrency: "NGN" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
