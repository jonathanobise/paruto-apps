import {
  replay,
  loadReplayData,
  splitPeriods,
  walkForward,
  type FilterMode,
  type ReplayResult,
} from '@alpha-desk/replay';
import { hashObject, newId } from '@alpha-desk/shared';
import { auditStmt } from './audit-writer.ts';
import type { Ctx } from './context.ts';

export interface ReplayStudy {
  id: string;
  configVersion: string;
  whole: ReplayResult;
  folds: Array<{ name: string; start: number; end: number; result: ReplayResult }>;
}

/** Replays the active strategy over recorded data, with dev/validation/test splits or walk-forward windows. */
export async function runReplayStudy(
  ctx: Ctx,
  o: {
    start: number;
    end: number;
    filterMode: FilterMode;
    folds: 'split' | 'walk';
    walkWindows: number;
    actor: string;
  },
): Promise<ReplayStudy> {
  const { config, configVersion } = await ctx.config();
  const { snapshots, assessments } = await loadReplayData(ctx.db, o.start, o.end);
  const params = {
    config,
    filterMode: o.filterMode,
    startingEquityUsd: config.risk.startingEquityUsd,
    defaultOneWayCostPct: 1.5,
  };
  const whole = replay(snapshots, assessments, params, { start: o.start, end: o.end });
  const periods =
    o.folds === 'split' ? splitPeriods(o.start, o.end) : walkForward(o.start, o.end, o.walkWindows);
  const folds = periods.map((f) => ({
    ...f,
    result: replay(snapshots, assessments, params, { start: f.start, end: f.end }),
  }));
  const now = ctx.clock.now();
  const id = newId('rr', now);
  const result = { whole, folds };
  const json = JSON.stringify(result, (_k, v) => (typeof v === 'bigint' ? v.toString() : v));
  await ctx.db.batch([
    {
      sql: `INSERT INTO replay_runs (id, config_version, strategy_version, filter_mode, period_start, period_end, params, result, sha256, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        id,
        configVersion,
        config.strategyVersion,
        o.filterMode,
        o.start,
        o.end,
        JSON.stringify({ folds: o.folds, walkWindows: o.walkWindows }),
        json,
        await hashObject(JSON.parse(json)),
        o.actor,
        now,
      ],
    },
    await auditStmt({
      category: 'REPORT',
      action: 'REPLAY',
      actor: o.actor,
      subjectType: 'replay',
      subjectId: id,
      detail: {
        filterMode: o.filterMode,
        start: o.start,
        end: o.end,
        observations: whole.observations,
        trades: whole.trades.length,
      },
      at: now,
    }),
  ]);
  return { id, configVersion, ...(JSON.parse(json) as Omit<ReplayStudy, 'id' | 'configVersion'>) };
}
