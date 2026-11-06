import { sql } from "drizzle-orm";
import { db } from "@/server/db/client";

export const dynamic = "force-dynamic";

/**
 * Liveness: `/api/health` (database reachable). Readiness: `/api/health?deep=1` also reports the
 * latest migration and whether the background worker has finished a job in the last 15 minutes.
 * No personal or financial data is returned.
 */
export async function GET(req: Request) {
  const deep = new URL(req.url).searchParams.get("deep") === "1";
  try {
    await db().execute(sql`select 1`);
    if (!deep) return Response.json({ status: "ok", db: "ok" }, { headers: { "cache-control": "no-store" } });
    const mig = await db().execute<{ created_at: string }>(sql`select created_at::text from drizzle.__drizzle_migrations order by created_at desc limit 1`).catch(() => ({ rows: [] as Array<{ created_at: string }> }));
    const worker = await db().execute<{ last: string | null; dead: string }>(sql`select max(finished_at)::text as last, count(*) filter (where status = 'dead')::text as dead from jobs`);
    const last = worker.rows[0]?.last ? new Date(worker.rows[0].last) : null;
    const workerOk = last !== null && Date.now() - last.getTime() < 15 * 60_000;
    return Response.json({ status: workerOk ? "ok" : "degraded", db: "ok", migration: mig.rows[0]?.created_at ?? null, worker: { lastFinished: last?.toISOString() ?? null, ok: workerOk, deadJobs: Number(worker.rows[0]?.dead ?? 0) } }, { status: workerOk ? 200 : 503, headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ status: "degraded", db: "unreachable" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
