import type { Hono, Next } from 'hono';
import { z } from 'zod';
import { StrategyConfigSchema } from '@alpha-desk/config';
import {
  approveOpportunity,
  auditStmt,
  closePosition,
  generateReport,
  getRuntime,
  liquidateAll,
  loadConfig,
  resetBreaker,
  resetPortfolio,
  setMode,
  updateRuntimeSettings,
  updateStrategy,
  type ReportKind,
} from '@alpha-desk/orchestrator';
import { BREAKERS, type Breaker } from '@alpha-desk/risk';
import { runReplayStudy } from '@alpha-desk/orchestrator';
import { DAY, RUNTIME_MODES } from '@alpha-desk/shared';
import { fail, ok, type C, type HonoEnv } from '../app.ts';

/** Administrative actions: in production they require MFA to be enrolled and verified for the session. */
async function requireAdmin(c: C, next: Next) {
  const s = c.get('session');
  const { env } = c.get('deps');
  if (env.APP_ENV === 'production' && !(s.mfaEnabled && s.mfaVerified))
    return fail(c, 403, 'enable and verify MFA before using administrative controls');
  return next();
}

const parse = async <T>(c: C, schema: z.ZodType<T>): Promise<T | null> => {
  const r = schema.safeParse(await c.req.json().catch(() => null));
  return r.success ? r.data : null;
};

export function controlRoutes(api: Hono<HonoEnv>): void {
  const actor = (c: C) => `owner:${c.get('session').email}`;
  const guard = (c: C, n: Next) => requireAdmin(c, n);

  api.post('/control/mode', guard, async (c) => {
    const b = await parse(c, z.object({ mode: z.enum(RUNTIME_MODES), reason: z.string().min(3).max(500) }));
    if (!b) return fail(c, 400, 'mode and reason required');
    try {
      await setMode(c.get('deps').ctx(), b.mode, actor(c), b.reason);
    } catch (e) {
      return fail(c, 409, (e as Error).message);
    }
    return ok(c, { mode: b.mode });
  });

  api.post('/control/emergency-pause', guard, async (c) => {
    const b = await parse(c, z.object({ reason: z.string().min(3).max(500) }));
    await setMode(c.get('deps').ctx(), 'EMERGENCY_PAUSED', actor(c), b?.reason ?? 'emergency pause');
    return ok(c, { mode: 'EMERGENCY_PAUSED' });
  });

  api.post('/control/liquidate', guard, async (c) => {
    const b = await parse(
      c,
      z.object({ confirm: z.literal('LIQUIDATE ALL'), reason: z.string().min(3).max(500) }),
    );
    if (!b) return fail(c, 400, 'type "LIQUIDATE ALL" and give a reason');
    return ok(c, { exitsRequested: await liquidateAll(c.get('deps').ctx(), actor(c), b.reason) });
  });

  api.post('/control/breakers/:breaker/reset', guard, async (c) => {
    const breaker = c.req.param('breaker') as Breaker;
    if (!BREAKERS.includes(breaker)) return fail(c, 404, 'unknown breaker');
    const b = await parse(c, z.object({ phrase: z.string(), reason: z.string().max(1000) }));
    if (!b) return fail(c, 400, 'phrase and reason required');
    try {
      await resetBreaker(c.get('deps').ctx(), breaker, b.phrase, b.reason, actor(c));
    } catch (e) {
      return fail(c, 409, (e as Error).message);
    }
    return ok(c, { reset: breaker });
  });

  api.post('/control/entries/resume', guard, async (c) => {
    const { db, now } = c.get('deps');
    const b = await parse(c, z.object({ reason: z.string().min(10).max(500) }));
    if (!b) return fail(c, 400, 'reason required (10+ characters)');
    const rt = await getRuntime(db);
    if (rt.entries_paused_reason === 'ledger reconciliation failed')
      return fail(c, 409, 'reset the DB_INTEGRITY breaker after a passing reconciliation instead');
    await db.batch([
      {
        sql: 'UPDATE runtime_state SET entries_paused_reason = NULL, updated_at = ?, updated_by = ? WHERE id = 1',
        params: [now(), actor(c)],
      },
      await auditStmt({
        category: 'ADMIN',
        action: 'ENTRIES_RESUMED',
        actor: actor(c),
        detail: { previous: rt.entries_paused_reason, reason: b.reason },
        at: now(),
      }),
    ]);
    return ok(c, { resumed: true });
  });

  api.post('/control/portfolio/reset', guard, async (c) => {
    const b = await parse(
      c,
      z.object({
        confirm: z.literal('RESET PORTFOLIO'),
        reason: z.string().min(10).max(500),
        startingEquityUsd: z.number().positive().max(10_000_000).optional(),
      }),
    );
    if (!b) return fail(c, 400, 'type "RESET PORTFOLIO" and give a reason (10+ characters)');
    const ctx = c.get('deps').ctx();
    const rt = await getRuntime(ctx.db);
    const { config } = await loadConfig(ctx.db);
    try {
      const id = await resetPortfolio(ctx.db, {
        reason: b.reason,
        startingEquityUsd: b.startingEquityUsd ?? config.risk.startingEquityUsd,
        now: ctx.clock.now(),
        actor: actor(c),
        timezone: rt.timezone,
      });
      return ok(c, { portfolioId: id });
    } catch (e) {
      return fail(c, 409, (e as Error).message);
    }
  });

  api.post('/opportunities/:candidateId/approve', guard, async (c) => {
    try {
      await approveOpportunity(c.get('deps').ctx(), c.req.param('candidateId')!, actor(c));
      return ok(c, { approved: true });
    } catch (e) {
      return fail(c, 409, (e as Error).message);
    }
  });

  api.post('/positions/:id/close', guard, async (c) => {
    try {
      return ok(c, { exitRequested: await closePosition(c.get('deps').ctx(), c.req.param('id')!, actor(c)) });
    } catch (e) {
      return fail(c, 409, (e as Error).message);
    }
  });

  api.post('/alerts/:id/ack', async (c) => {
    const { db, now } = c.get('deps');
    await db.run(
      'UPDATE system_alerts SET acknowledged_at = ?, acknowledged_by = ? WHERE id = ? AND acknowledged_at IS NULL',
      [now(), actor(c), c.req.param('id')],
    );
    return ok(c, { acknowledged: true });
  });

  api.post('/reports/generate', async (c) => {
    const kinds = [
      'MORNING',
      'DAILY_PNL',
      'REJECTION_FUNNEL',
      'AGENT_RELIABILITY',
      'WEEKLY',
      'STRATEGY_COMPARISON',
      'INCIDENT',
    ] as const;
    const b = await parse(
      c,
      z.object({ kind: z.enum(kinds), periodStart: z.number().optional(), periodEnd: z.number().optional() }),
    );
    if (!b) return fail(c, 400, 'kind required');
    const ctx = c.get('deps').ctx();
    const end = b.periodEnd ?? ctx.clock.now();
    const start =
      b.periodStart ?? end - (b.kind === 'WEEKLY' || b.kind === 'STRATEGY_COMPARISON' ? 7 * DAY : DAY);
    if (start >= end) return fail(c, 400, 'period start must precede end');
    const r = await generateReport(ctx, b.kind as ReportKind, start, end);
    return ok(c, { id: r.id });
  });

  api.put('/settings/runtime', guard, async (c) => {
    const b = await parse(
      c,
      z.object({
        timezone: z.string().min(1).max(64).optional(),
        reportHourLocal: z.number().int().min(0).max(23).optional(),
        apiDailyCallCap: z.number().int().min(1000).max(10_000_000).optional(),
        heliusDailyCreditCap: z.number().int().min(0).max(100_000_000).optional(),
      }),
    );
    if (!b) return fail(c, 400, 'invalid settings');
    try {
      await updateRuntimeSettings(c.get('deps').ctx(), b, actor(c));
    } catch (e) {
      return fail(c, 400, (e as Error).message);
    }
    return ok(c, { updated: true });
  });

  api.put('/settings/strategy', guard, async (c) => {
    const body = (await c.req.json().catch(() => null)) as { config?: unknown; reason?: string } | null;
    const parsed = StrategyConfigSchema.safeParse(body?.config);
    if (!parsed.success)
      return fail(
        c,
        400,
        `invalid strategy: ${parsed.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; ')
          .slice(0, 500)}`,
      );
    if (!body?.reason || body.reason.length < 10) return fail(c, 400, 'reason required (10+ characters)');
    const v = await updateStrategy(c.get('deps').ctx(), parsed.data, actor(c), body.reason);
    return ok(c, { configVersion: v });
  });

  api.post('/replay/run', async (c) => {
    const b = await parse(
      c,
      z.object({
        start: z.number(),
        end: z.number(),
        filterMode: z.enum(['RECORDED', 'MARKET_RULES_ONLY']),
        folds: z.enum(['split', 'walk']).default('split'),
        walkWindows: z.number().int().min(2).max(12).default(4),
      }),
    );
    if (!b || b.start >= b.end) return fail(c, 400, 'start < end, filterMode and folds required');
    if (b.end - b.start > 90 * DAY) return fail(c, 400, 'replay period is limited to 90 days per run');
    const r = await runReplayStudy(c.get('deps').ctx(), { ...b, actor: actor(c) });
    return ok(c, r);
  });
}
