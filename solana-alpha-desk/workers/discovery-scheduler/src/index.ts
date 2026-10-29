import { ensureBootstrapped, workerCtx, type Env } from '@alpha-desk/api/worker';
import {
  activeBreakers,
  getRuntime,
  ProviderMetrics,
  queueDepths,
  recordJob,
  refreshCandidateSnapshots,
  runDiscoveryCycle,
} from '@alpha-desk/orchestrator';

/**
 * Cron Trigger (every minute): one Scout cycle and a candidate snapshot refresh. Discovered candidates are
 * written to work_items and announced on the candidate queue for the processor Worker; any filter or
 * analyst work still waiting (for example deferred for more snapshots) is re-announced each minute.
 * Skips discovery while the API budget breaker is tripped (quota-aware scheduling).
 */
export default {
  async scheduled(_event: ScheduledController, env: Env): Promise<void> {
    await ensureBootstrapped(env);
    const metrics = new ProviderMetrics();
    const ctx = workerCtx(env, metrics);
    const rt = await getRuntime(ctx.db);
    if (rt.mode === 'STOPPED') return;
    if (
      rt.active_portfolio_id &&
      (await activeBreakers(ctx.db, rt.active_portfolio_id)).includes('API_BUDGET')
    )
      return;
    const started = Date.now();
    try {
      const r = await runDiscoveryCycle(ctx);
      await refreshCandidateSnapshots(ctx).catch((e) =>
        ctx.log.warn('snapshot refresh failed', { error: (e as Error).message }),
      );
      const depths = await queueDepths(ctx.db);
      for (const q of ['filter', 'analyst'] as const) if (depths[q]) await ctx.notify?.(q);
      ctx.log.info('discovery cycle', { ...r, errors: r.errors.slice(0, 3), depths });
    } catch (e) {
      await recordJob(ctx.db, 'scout', {
        now: Date.now(),
        ok: false,
        error: (e as Error).message,
        latencyMs: Date.now() - started,
        instanceId: ctx.instanceId,
      });
      throw e;
    } finally {
      await metrics.flush(ctx.db, {}).catch(() => undefined);
    }
  },
} satisfies ExportedHandler<Env>;
