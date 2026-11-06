import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { AppError } from "./errors";

/**
 * Fixed-window rate limiting stored in Postgres so it holds across server instances.
 * Throws RATE_LIMITED when `limit` is exceeded within `windowSeconds`.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<void> {
  const windowStart = new Date(Math.floor(Date.now() / 1000 / windowSeconds) * windowSeconds * 1000);
  const result = await db().execute<{ count: number }>(sql`
    insert into rate_limit_buckets (key, window_start, count) values (${key}, ${windowStart.toISOString()}, 1)
    on conflict (key, window_start) do update set count = rate_limit_buckets.count + 1
    returning count`);
  const count = Number(result.rows[0]?.count ?? 0);
  if (count > limit) throw new AppError("RATE_LIMITED", "Too many attempts. Please wait a few minutes and try again.");
}

/** Housekeeping: drop buckets older than a day. */
export async function pruneRateLimits(): Promise<void> {
  await db().execute(sql`delete from rate_limit_buckets where window_start < now() - interval '1 day'`);
}
