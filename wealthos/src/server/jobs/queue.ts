import "server-only";
import { sql } from "drizzle-orm";
import { jobs } from "@/server/db/schema";
import { db } from "@/server/db/client";

export interface EnqueueOptions {
  runAt?: Date;
  dedupeKey?: string;
  maxAttempts?: number;
}

/** Queue a job. Returns null if a job with the same dedupe key already exists (idempotent scheduling). */
export async function enqueue(queue: string, payload: Record<string, unknown>, opts: EnqueueOptions = {}): Promise<string | null> {
  const rows = await db()
    .insert(jobs)
    .values({ queue, payload, runAt: opts.runAt ?? new Date(), dedupeKey: opts.dedupeKey ?? null, maxAttempts: opts.maxAttempts ?? 5 })
    .onConflictDoNothing()
    .returning({ id: jobs.id });
  return rows[0]?.id ?? null;
}

export interface ClaimedJob {
  id: string;
  queue: string;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
}

/** Atomically claim up to `limit` due jobs. Concurrent workers never receive the same job. */
export async function claim(workerId: string, queues: string[], limit = 10): Promise<ClaimedJob[]> {
  const r = await db().execute<{ id: string; queue: string; payload: Record<string, unknown>; attempts: number; max_attempts: number }>(sql`
    update jobs set status = 'running', locked_at = now(), locked_by = ${workerId}, attempts = attempts + 1
    where id in (
      select id from jobs
      where status = 'queued' and run_at <= now() and queue = any(${sql.param(queues)}::text[])
      order by run_at
      for update skip locked
      limit ${limit}
    )
    returning id, queue, payload, attempts, max_attempts`);
  return r.rows.map((x) => ({ id: x.id, queue: x.queue, payload: x.payload, attempts: x.attempts, maxAttempts: x.max_attempts }));
}

export async function complete(id: string): Promise<void> {
  await db().execute(sql`update jobs set status = 'succeeded', finished_at = now(), locked_at = null, last_error = null where id = ${id}`);
}

/** Exponential backoff: 30 s, 60 s, 120 s … capped at 1 hour. */
export function backoffSeconds(attempts: number): number {
  return Math.min(3600, 30 * 2 ** Math.max(0, attempts - 1));
}

/** Record a failure: retry later, or mark dead after the last attempt. */
export async function fail(job: ClaimedJob, error: unknown): Promise<"retry" | "dead"> {
  const message = (error instanceof Error ? `${error.name}: ${error.message}` : String(error)).slice(0, 2000);
  if (job.attempts >= job.maxAttempts) {
    await db().execute(sql`update jobs set status = 'dead', finished_at = now(), locked_at = null, last_error = ${message} where id = ${job.id}`);
    return "dead";
  }
  await db().execute(sql`update jobs set status = 'queued', locked_at = null, locked_by = null, last_error = ${message}, run_at = now() + make_interval(secs => ${backoffSeconds(job.attempts)}) where id = ${job.id}`);
  return "retry";
}

/** Return jobs whose worker died mid-run to the queue (their attempt still counts). */
export async function recoverStale(olderThanMinutes = 10): Promise<number> {
  const r = await db().execute(sql`update jobs set status = 'queued', locked_at = null, locked_by = null, last_error = coalesce(last_error, 'worker lost') where status = 'running' and locked_at < now() - make_interval(mins => ${olderThanMinutes})`);
  return r.rowCount ?? 0;
}

export type JobHandler = (payload: Record<string, unknown>) => Promise<void>;

/** Claim and run one batch. Handlers must be idempotent: a job can run more than once after a crash. */
export async function runOnce(workerId: string, handlers: Record<string, JobHandler>, limit = 10): Promise<{ succeeded: number; retried: number; dead: number }> {
  const claimed = await claim(workerId, Object.keys(handlers), limit);
  const out = { succeeded: 0, retried: 0, dead: 0 };
  for (const job of claimed) {
    try {
      await handlers[job.queue]!(job.payload);
      await complete(job.id);
      out.succeeded++;
    } catch (err) {
      if ((await fail(job, err)) === "dead") out.dead++;
      else out.retried++;
    }
  }
  return out;
}
