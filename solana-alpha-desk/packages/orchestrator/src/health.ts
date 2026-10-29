import type { SqlDb } from '@alpha-desk/db';
import type { CallMetric } from '@alpha-desk/providers';
import type { HealthStatus } from '@alpha-desk/shared';

export async function recordJob(
  db: SqlDb,
  id: string,
  r: { now: number; ok: boolean; error: string | null; processed?: number; rejected?: number; latencyMs?: number; queueDepth?: number; instanceId: string; status?: HealthStatus },
): Promise<void> {
  const status: HealthStatus = r.status ?? (r.ok ? 'HEALTHY' : 'DEGRADED');
  await db.run(
    `INSERT INTO background_jobs (id, kind, status, instance_id, started_at, heartbeat_at, last_success_at, last_error, last_error_at, queue_depth, processed, rejected, last_latency_ms)
     VALUES (?, 'agent', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET status = excluded.status, instance_id = excluded.instance_id, heartbeat_at = excluded.heartbeat_at,
       last_success_at = COALESCE(excluded.last_success_at, background_jobs.last_success_at),
       last_error = COALESCE(excluded.last_error, background_jobs.last_error), last_error_at = COALESCE(excluded.last_error_at, background_jobs.last_error_at),
       queue_depth = excluded.queue_depth, processed = background_jobs.processed + excluded.processed, rejected = background_jobs.rejected + excluded.rejected,
       last_latency_ms = COALESCE(excluded.last_latency_ms, background_jobs.last_latency_ms)`,
    [
      id, status, r.instanceId, r.now, r.now, r.ok ? r.now : null, r.error, r.error ? r.now : null,
      r.queueDepth ?? 0, r.processed ?? 0, r.rejected ?? 0, r.latencyMs ?? null,
    ],
  );
}

/** Marks a process start; counts restarts so the dashboard can show them. */
export async function recordStart(db: SqlDb, id: string, instanceId: string, now: number): Promise<void> {
  await db.run(
    `INSERT INTO background_jobs (id, kind, status, instance_id, started_at, heartbeat_at, restarts) VALUES (?, 'service', 'HEALTHY', ?, ?, ?, 0)
     ON CONFLICT(id) DO UPDATE SET restarts = background_jobs.restarts + 1, instance_id = excluded.instance_id, started_at = excluded.started_at, heartbeat_at = excluded.heartbeat_at, status = 'HEALTHY'`,
    [id, instanceId, now, now],
  );
}

/** Buffers provider call metrics in memory and flushes them per minute bucket. */
export class ProviderMetrics {
  private buf = new Map<string, { calls: number; errors: number; rateLimited: number; latency: number; max: number; lastError: string | null; lastOk: number | null }>();
  readonly callsToday = new Map<string, number>();
  private day = '';

  record = (m: CallMetric): void => {
    const bucket = Math.floor(m.at / 60_000) * 60_000;
    const key = `${m.provider}|${bucket}`;
    const b = this.buf.get(key) ?? { calls: 0, errors: 0, rateLimited: 0, latency: 0, max: 0, lastError: null, lastOk: null };
    b.calls++;
    if (!m.ok) b.errors++;
    if (m.rateLimited) b.rateLimited++;
    b.latency += m.latencyMs;
    b.max = Math.max(b.max, m.latencyMs);
    if (m.error) b.lastError = `${m.endpoint}: ${m.error}`;
    if (m.ok) b.lastOk = m.at;
    this.buf.set(key, b);
    const d = new Date(m.at).toISOString().slice(0, 10);
    if (d !== this.day) {
      this.day = d;
      this.callsToday.clear();
    }
    this.callsToday.set(m.provider, (this.callsToday.get(m.provider) ?? 0) + 1);
  };

  totalCallsToday(): number {
    return [...this.callsToday.values()].reduce((a, b) => a + b, 0);
  }

  async flush(db: SqlDb, circuits: Record<string, string>): Promise<void> {
    const entries = [...this.buf.entries()];
    this.buf.clear();
    if (!entries.length) return;
    await db.batch(
      entries.map(([key, b]) => {
        const [provider, bucket] = key.split('|');
        return {
          sql: `INSERT INTO provider_health (provider_id, window_start, calls, errors, rate_limited, total_latency_ms, max_latency_ms, last_error, last_success_at, circuit_state)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(provider_id, window_start) DO UPDATE SET calls = calls + excluded.calls, errors = errors + excluded.errors,
                  rate_limited = rate_limited + excluded.rate_limited, total_latency_ms = total_latency_ms + excluded.total_latency_ms,
                  max_latency_ms = MAX(max_latency_ms, excluded.max_latency_ms), last_error = COALESCE(excluded.last_error, last_error),
                  last_success_at = COALESCE(excluded.last_success_at, last_success_at), circuit_state = excluded.circuit_state`,
          params: [provider!, Number(bucket), b.calls, b.errors, b.rateLimited, b.latency, b.max, b.lastError, b.lastOk, circuits[provider!] ?? 'CLOSED'],
        };
      }),
    );
  }
}

/** Provider health over the last `windowMs`, used for the data-outage and verification-quality breakers. */
export async function providerErrorRates(db: SqlDb, now: number, windowMs: number): Promise<Record<string, { calls: number; errors: number; rate: number; lastSuccessAt: number | null }>> {
  const rows = await db.all<{ provider_id: string; calls: number; errors: number; last_ok: number | null }>(
    `SELECT provider_id, SUM(calls) AS calls, SUM(errors) AS errors, MAX(last_success_at) AS last_ok FROM provider_health WHERE window_start >= ? GROUP BY provider_id`,
    [now - windowMs],
  );
  return Object.fromEntries(rows.map((r) => [r.provider_id, { calls: Number(r.calls), errors: Number(r.errors), rate: Number(r.calls) ? Number(r.errors) / Number(r.calls) : 0, lastSuccessAt: r.last_ok }]));
}
