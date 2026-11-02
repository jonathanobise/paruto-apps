import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { closeDb, db, withTenant } from "@/server/db/client";
import { alerts, jobs } from "@/server/db/schema";
import { claim, complete, enqueue, fail, recoverStale, runOnce } from "@/server/jobs/queue";
import { createAlert, evaluateAlerts, jobHandlers, listAlerts, listNotifications, markRead, scheduleAlertEvaluations, unreadCount } from "@/server/alerts/service";
import { createAccount } from "@/server/accounts/service";
import { postEvent } from "@/server/ledger/service";
import { saveGoal } from "@/server/planning/goals";
import { addMonths } from "@/engine";
import { expectDbRejection, makeUser, ownerPool } from "./helpers";

const today = new Date().toISOString().slice(0, 10);
let user: Awaited<ReturnType<typeof makeUser>>;
let instrumentId: string;
let billId: string;
let acc: string;

beforeAll(async () => {
  const pool = ownerPool();
  const src = (await pool.query("insert into market_data_sources (key, name, kind, license_note) values ('alert-src', 'Alert tests', 'official', 'Test only') returning id")).rows[0].id;
  instrumentId = (await pool.query("insert into instruments (name, symbol, asset_class, country, region, currency, pricing_model, stale_after_days, verification_state) values ('Alert Test Plc', 'ALRT', 'equity', 'NG', 'Africa', 'NGN', 'market', 5, 'verified') returning id")).rows[0].id;
  // A bill maturing in 10 days, inside a 14-day reminder window.
  billId = (await pool.query("insert into instruments (name, symbol, asset_class, country, region, currency, pricing_model, stale_after_days, face_value_per_unit, maturity_date, verification_state) values ('Alert Bill', 'ABILL', 'treasury_bill', 'NG', 'Africa', 'NGN', 'discount_accrual', 7, 1, current_date + 10, 'verified') returning id")).rows[0].id;
  await pool.query("insert into market_prices (instrument_id, source_id, observed_on, price, currency, methodology, verification_state) values ($1,$2,$3,80,'NGN','close','verified')", [instrumentId, src, today]);
  await pool.query("insert into fx_rates (base, quote, rate, observed_on, source_id, methodology, verification_state) values ('USD','NGN',1600,$1,$2,'official','verified')", [today, src]);
  await pool.end();
  user = await makeUser("Alerter");
  acc = (await createAccount(user.ctx, { name: "Broker", type: "brokerage", currency: "NGN" })).id;
  await postEvent(user.ctx, { type: "deposit", accountId: acc, currency: "NGN", amount: "1000000", occurredOn: addMonths(today, -1) });
  await postEvent(user.ctx, { type: "buy", accountId: acc, instrumentId, quantity: "10000", price: "70", fees: "0", currency: "NGN", occurredOn: addMonths(today, -1) });
  await postEvent(user.ctx, { type: "buy", accountId: acc, instrumentId: billId, quantity: "100000", price: "0.95", fees: "0", currency: "NGN", occurredOn: addMonths(today, -1) });
});
afterAll(async () => closeDb());

describe("durable job queue", () => {
  it("deduplicates, never hands the same job to two workers, retries with backoff and dead-letters", async () => {
    const key = `test:${Date.now()}`;
    const id = await enqueue("test.q", { n: 1 }, { dedupeKey: key, maxAttempts: 2 });
    expect(id).not.toBeNull();
    expect(await enqueue("test.q", { n: 2 }, { dedupeKey: key })).toBeNull();

    const [a, b] = await Promise.all([claim("w1", ["test.q"], 5), claim("w2", ["test.q"], 5)]);
    expect(a.length + b.length).toBe(1);
    const job = [...a, ...b][0]!;
    expect(await fail(job, new Error("boom"))).toBe("retry");
    const [row] = await db().select().from(jobs).where(sql`id = ${job.id}`);
    expect(row!.status).toBe("queued");
    expect(row!.runAt.getTime()).toBeGreaterThan(Date.now() + 20_000); // backoff
    await db().execute(sql`update jobs set run_at = now() where id = ${job.id}`);
    const [again] = await claim("w1", ["test.q"], 5);
    expect(again!.attempts).toBe(2);
    expect(await fail(again!, new Error("boom again"))).toBe("dead");
    const [dead] = await db().select().from(jobs).where(sql`id = ${job.id}`);
    expect(dead).toMatchObject({ status: "dead", lastError: "Error: boom again" });
  });

  it("recovers jobs from a crashed worker", async () => {
    await enqueue("test.crash", {}, { dedupeKey: `crash:${Date.now()}` });
    const [j] = await claim("dying", ["test.crash"], 1);
    await db().execute(sql`update jobs set locked_at = now() - interval '1 hour' where id = ${j!.id}`);
    expect(await recoverStale(10)).toBeGreaterThanOrEqual(1);
    const [back] = await claim("w2", ["test.crash"], 1);
    expect(back!.id).toBe(j!.id);
    await complete(back!.id);
  });
});

describe("alerts", () => {
  it("fires price, FX, maturity and concentration alerts once per event", async () => {
    await createAlert(user.ctx, { kind: "price_above", instrumentId, level: "75" });
    await createAlert(user.ctx, { kind: "price_below", instrumentId, level: "50" });
    await createAlert(user.ctx, { kind: "fx_above", base: "USD", quote: "NGN", level: "1,550" });
    await createAlert(user.ctx, { kind: "maturity_reminder", daysBefore: 14 });
    await createAlert(user.ctx, { kind: "concentration", maxWeightPct: 50 });
    const first = await evaluateAlerts(user.ctx);
    expect(first.notified).toBe(4); // price_below does not fire
    const second = await evaluateAlerts(user.ctx);
    expect(second.notified).toBe(0); // idempotent
    const list = await listNotifications(user.ctx);
    expect(list.map((n) => n.kind).sort()).toEqual(["concentration", "fx_above", "maturity_reminder", "price_above"]);
    expect(list.find((n) => n.kind === "price_above")!.body).toMatch(/Latest price ₦80\.00/);
    // One-shot alerts switch off after firing; repeating ones stay on.
    const rules = await listAlerts(user.ctx);
    expect(rules.find((r) => r.kind === "price_above")!.enabled).toBe(false);
    expect(rules.find((r) => r.kind === "maturity_reminder")!.enabled).toBe(true);
    expect(await unreadCount(user.ctx)).toBe(4);
    await markRead(user.ctx);
    expect(await unreadCount(user.ctx)).toBe(0);
  });

  it("does not fire price alerts on stale prices", async () => {
    const u = await makeUser("Stale");
    const pool = ownerPool();
    await pool.query("update market_prices set observed_on = current_date - 30 where instrument_id = $1", [instrumentId]);
    await pool.end();
    await createAlert(u.ctx, { kind: "price_above", instrumentId, level: "75" });
    expect((await evaluateAlerts(u.ctx)).notified).toBe(0);
    const pool2 = ownerPool();
    await pool2.query("update market_prices set observed_on = current_date where instrument_id = $1", [instrumentId]);
    await pool2.end();
  });

  it("notifies goal milestones once each", async () => {
    const goalId = await saveGoal(user.ctx, null, { name: "Cushion", kind: "emergency", targetAmount: "1500000", currency: "NGN", targetDate: addMonths(today, 12), targetIsReal: false, scope: "net_worth", accountIds: [], monthlyContribution: "0", contributionTiming: "end", contributionGrowthPct: "0", inflationPct: "15", annualFeePct: "0", scenarios: [{ label: "A", annualReturnPct: "5" }, { label: "B", annualReturnPct: "10" }] });
    await createAlert(user.ctx, { kind: "goal_progress", goalId });
    const r = await evaluateAlerts(user.ctx);
    const titles = (await listNotifications(user.ctx)).filter((n) => n.kind === "goal_progress").map((n) => n.title);
    expect(titles.length).toBe(r.notified);
    expect(titles.some((t) => t.includes("25%"))).toBe(true);
    expect((await evaluateAlerts(user.ctx)).notified).toBe(0);
  });

  it("is scheduled through the queue and processed by the worker", async () => {
    const u = await makeUser("Scheduled");
    await createAlert(u.ctx, { kind: "fx_above", base: "USD", quote: "NGN", level: "1000", repeat: true });
    expect(await scheduleAlertEvaluations()).toBeGreaterThanOrEqual(1);
    expect(await scheduleAlertEvaluations()).toBe(0); // same hour: deduplicated
    let r = await runOnce("test-worker", jobHandlers, 50);
    while (r.succeeded + r.retried + r.dead > 0) r = await runOnce("test-worker", jobHandlers, 50);
    expect((await listNotifications(u.ctx)).map((n) => n.kind)).toEqual(["fx_above"]);
  });

  it("keeps alerts and notifications private to their owner", async () => {
    const other = await makeUser("Nosy");
    expect(await listAlerts(other.ctx)).toHaveLength(0);
    expect(await listNotifications(other.ctx)).toHaveLength(0);
    // Even a member of the same organisation can't see someone else's alerts.
    const pool = ownerPool();
    await pool.query("insert into memberships (org_id, user_id, role) values ($1, $2, 'member')", [user.orgId, other.userId]);
    await pool.end();
    const sameOrg = { userId: other.userId, orgId: user.orgId };
    expect(await listAlerts(sameOrg)).toHaveLength(0);
    expect(await listNotifications(sameOrg)).toHaveLength(0);
    await expectDbRejection(withTenant(sameOrg, (tx) => tx.insert(alerts).values({ orgId: user.orgId, userId: user.userId, kind: "data_stale", params: {} })), /row-level security/);
  });

  it("validates alert input", async () => {
    await expect(createAlert(user.ctx, { kind: "price_above", instrumentId, level: "-5" })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(createAlert(user.ctx, { kind: "concentration", maxWeightPct: 2 })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(createAlert(user.ctx, { kind: "price_above", instrumentId: "00000000-0000-4000-8000-000000000000", level: "5" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
