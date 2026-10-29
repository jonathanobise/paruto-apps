import { sha256Hex, DAY } from '@alpha-desk/shared';
import { auditStmt } from './audit-writer.ts';
import type { Ctx } from './context.ts';

/**
 * Retention policy (spec §7.3). Raw high-frequency data is archived to object storage as JSONL (with a
 * checksum in the audit log) before it is pruned from D1. Security evidence, trades, fills, ledger,
 * audit events and reports are never pruned. Operational logs are tiered.
 */
export interface RetentionPolicy {
  marketSnapshotDays: number;
  positionMarkDays: number;
  providerHealthDays: number;
  workItemDays: number;
  rateLimitHours: number;
  nonceHours: number;
}

export const DEFAULT_RETENTION: RetentionPolicy = {
  marketSnapshotDays: 14,
  positionMarkDays: 30,
  providerHealthDays: 30,
  workItemDays: 7,
  rateLimitHours: 24,
  nonceHours: 2,
};

async function archiveAndPrune(
  ctx: Ctx,
  table: 'market_snapshots' | 'position_marks',
  column: string,
  cutoff: number,
  extraWhere = '',
): Promise<{ rows: number; key: string | null }> {
  const rows = await ctx.db.all<Record<string, unknown>>(
    `SELECT * FROM ${table} WHERE ${column} < ? ${extraWhere} ORDER BY ${column} LIMIT 20000`,
    [cutoff],
  );
  if (!rows.length) return { rows: 0, key: null };
  const body = rows.map((r) => JSON.stringify(r)).join('\n');
  const sha = await sha256Hex(body);
  const key = `archive/${table}/${new Date(cutoff).toISOString().slice(0, 10)}-${sha.slice(0, 12)}.jsonl`;
  await ctx.evidenceStore.put(key, body);
  const ids = rows.map((r) => String(r.id));
  const stmts = [];
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    stmts.push({
      sql: `DELETE FROM ${table} WHERE id IN (${chunk.map(() => '?').join(',')})`,
      params: chunk,
    });
  }
  stmts.push(
    await auditStmt({
      category: 'AUTOMATION',
      action: 'ARCHIVED',
      actor: 'LOGGER',
      subjectType: table,
      detail: { rows: rows.length, key, sha256: sha, cutoff },
      at: ctx.clock.now(),
    }),
  );
  await ctx.db.batch(stmts);
  return { rows: rows.length, key };
}

export async function runRetention(
  ctx: Ctx,
  policy: RetentionPolicy = DEFAULT_RETENTION,
): Promise<Record<string, number>> {
  const now = ctx.clock.now();
  const out: Record<string, number> = {};
  // Snapshots still referenced by a candidate run are kept with that run.
  out.market_snapshots = (
    await archiveAndPrune(
      ctx,
      'market_snapshots',
      'observed_at',
      now - policy.marketSnapshotDays * DAY,
      'AND id NOT IN (SELECT snapshot_id FROM candidate_discoveries WHERE snapshot_id IS NOT NULL)',
    )
  ).rows;
  out.position_marks = (
    await archiveAndPrune(
      ctx,
      'position_marks',
      'observed_at',
      now - policy.positionMarkDays * DAY,
      "AND position_id IN (SELECT id FROM positions WHERE status = 'CLOSED')",
    )
  ).rows;
  out.provider_health = (
    await ctx.db.run('DELETE FROM provider_health WHERE window_start < ?', [
      now - policy.providerHealthDays * DAY,
    ])
  ).changes;
  out.work_items = (
    await ctx.db.run(`DELETE FROM work_items WHERE status = 'DONE' AND updated_at < ?`, [
      now - policy.workItemDays * DAY,
    ])
  ).changes;
  out.rate_limits = (
    await ctx.db.run('DELETE FROM rate_limits WHERE window_start < ?', [
      now - policy.rateLimitHours * 3_600_000,
    ])
  ).changes;
  out.internal_nonces = (
    await ctx.db.run('DELETE FROM internal_nonces WHERE seen_at < ?', [now - policy.nonceHours * 3_600_000])
  ).changes;
  out.sessions = (await ctx.db.run('DELETE FROM sessions WHERE expires_at < ?', [now - DAY])).changes;
  return out;
}
