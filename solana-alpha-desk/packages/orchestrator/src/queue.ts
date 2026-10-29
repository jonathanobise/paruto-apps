import type { SqlDb } from '@alpha-desk/db';
import { newId } from '@alpha-desk/shared';
import { alertStmt, auditStmt } from './audit-writer.ts';

export type QueueName = 'filter' | 'analyst' | 'risk' | 'execute' | 'exit';

export interface WorkItem {
  id: string;
  queue: QueueName;
  candidate_id: string | null;
  idempotency_key: string;
  payload: string;
  attempts: number;
  max_attempts: number;
}

/**
 * Durable work queue in D1/SQLite used by the long-running monitor (Cloudflare Queues feed the same
 * handlers in the Workers deployment). At-least-once delivery: handlers must be idempotent, which the
 * state-machine guard and handoff idempotency keys guarantee. Expired leases are re-delivered after a
 * crash; items that exhaust their attempts move to DEAD (the dead-letter state) and raise an alert.
 */
export async function enqueue(
  db: SqlDb,
  queue: QueueName,
  idempotencyKey: string,
  payload: unknown,
  now: number,
  candidateId: string | null = null,
  delayMs = 0,
): Promise<boolean> {
  const r = await db.run(
    `INSERT OR IGNORE INTO work_items (id, queue, candidate_id, idempotency_key, payload, status, attempts, max_attempts, available_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'PENDING', 0, 5, ?, ?, ?)`,
    [newId('wi', now), queue, candidateId, idempotencyKey, JSON.stringify(payload), now + delayMs, now, now],
  );
  return r.changes > 0;
}

export async function lease(
  db: SqlDb,
  queue: QueueName,
  now: number,
  leaseMs: number,
  limit: number,
): Promise<WorkItem[]> {
  const rows = await db.all<WorkItem & { status: string }>(
    `SELECT id, queue, candidate_id, idempotency_key, payload, attempts, max_attempts, status FROM work_items
     WHERE queue = ? AND ((status = 'PENDING' AND available_at <= ?) OR (status = 'IN_PROGRESS' AND leased_until < ?))
     ORDER BY available_at LIMIT ?`,
    [queue, now, now, limit],
  );
  const out: WorkItem[] = [];
  for (const r of rows) {
    const res = await db.run(
      `UPDATE work_items SET status = 'IN_PROGRESS', attempts = attempts + 1, leased_until = ?, updated_at = ? WHERE id = ? AND status = ? AND attempts = ?`,
      [now + leaseMs, now, r.id, r.status, r.attempts],
    );
    if (res.changes === 1) out.push({ ...r, attempts: r.attempts + 1 });
  }
  return out;
}

export async function complete(db: SqlDb, id: string, now: number): Promise<void> {
  await db.run(`UPDATE work_items SET status = 'DONE', leased_until = NULL, updated_at = ? WHERE id = ?`, [
    now,
    id,
  ]);
}

export async function fail(db: SqlDb, item: WorkItem, error: string, now: number): Promise<'RETRY' | 'DEAD'> {
  if (item.attempts >= item.max_attempts) {
    await db.batch([
      {
        sql: `UPDATE work_items SET status = 'DEAD', last_error = ?, leased_until = NULL, updated_at = ? WHERE id = ?`,
        params: [error.slice(0, 1000), now, item.id],
      },
      alertStmt(
        'WARNING',
        `queue:${item.queue}`,
        `Work item dead-lettered after ${item.attempts} attempts`,
        error,
        now,
        `dead:${item.id}`,
      ),
      await auditStmt({
        category: 'AUTOMATION',
        action: 'DEAD_LETTER',
        actor: 'SYSTEM',
        subjectType: 'work_item',
        subjectId: item.id,
        detail: { queue: item.queue, error: error.slice(0, 500) },
        at: now,
      }),
    ]);
    return 'DEAD';
  }
  const backoff = Math.min(300_000, 5_000 * 2 ** (item.attempts - 1));
  await db.run(
    `UPDATE work_items SET status = 'PENDING', last_error = ?, available_at = ?, leased_until = NULL, updated_at = ? WHERE id = ?`,
    [error.slice(0, 1000), now + backoff, now, item.id],
  );
  return 'RETRY';
}

export async function queueDepths(db: SqlDb): Promise<Record<string, number>> {
  const rows = await db.all<{ queue: string; n: number }>(
    `SELECT queue, COUNT(*) AS n FROM work_items WHERE status IN ('PENDING','IN_PROGRESS') GROUP BY queue`,
  );
  return Object.fromEntries(rows.map((r) => [r.queue, Number(r.n)]));
}

/** Re-schedules a leased item without consuming an attempt (used when a stage is waiting for data). */
export async function defer(db: SqlDb, id: string, until: number, now: number): Promise<void> {
  await db.run(
    `UPDATE work_items SET status = 'PENDING', attempts = MAX(0, attempts - 1), available_at = ?, leased_until = NULL, updated_at = ? WHERE id = ?`,
    [until, now, id],
  );
}
