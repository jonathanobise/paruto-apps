/**
 * Background worker: schedules alert evaluations and the billing lifecycle, and processes the
 * durable job queue.
 *
 *   npm run worker            # run continuously
 *   npm run worker -- --once  # one scheduling + processing pass (cron-friendly)
 *
 * Safe to run several copies: jobs are claimed with SKIP LOCKED and scheduling is deduplicated.
 */
import { config } from "dotenv";
import { hostname } from "node:os";

config({ path: process.env.ENV_FILE ?? ".env.local", quiet: true });

const { runOnce, recoverStale } = await import("../src/server/jobs/queue");
const { jobHandlers: alertHandlers, scheduleAlertEvaluations } = await import("../src/server/alerts/service");
const { billingJobHandlers, scheduleBillingLifecycle } = await import("../src/server/billing/service");
const jobHandlers = { ...alertHandlers, ...billingJobHandlers };
const { closeDb } = await import("../src/server/db/client");

const workerId = `${hostname()}:${process.pid}`;
const once = process.argv.includes("--once");
let stopping = false;
process.on("SIGTERM", () => (stopping = true));
process.on("SIGINT", () => (stopping = true));

let lastSchedule = 0;
do {
  try {
    if (Date.now() - lastSchedule > 5 * 60_000) {
      const recovered = await recoverStale();
      const scheduled = (await scheduleAlertEvaluations()) + ((await scheduleBillingLifecycle()) ? 1 : 0);
      lastSchedule = Date.now();
      if (recovered || scheduled) console.log(`[worker] recovered ${recovered}, scheduled ${scheduled}`);
    }
    const r = await runOnce(workerId, jobHandlers, 20);
    if (r.succeeded || r.retried || r.dead) console.log(`[worker] ${JSON.stringify(r)}`);
    if (!once && !r.succeeded && !r.retried && !r.dead) await new Promise((res) => setTimeout(res, 5000));
  } catch (err) {
    console.error("[worker] loop error", err);
    if (!once) await new Promise((res) => setTimeout(res, 10_000));
  }
} while (!once && !stopping);
await closeDb();
