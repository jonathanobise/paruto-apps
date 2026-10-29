import { ensureBootstrapped, workerCtx, type Env } from '@alpha-desk/api/worker';
import {
  activeBreakers,
  expireStale,
  getRuntime,
  recordJob,
  refreshCandidateSnapshots,
  runDiscoveryCycle,
} from '@alpha-desk/orchestrator';

/**
 * Cron Trigger (every minute): one Scout cycle, candidate snapshot refresh and expiry sweep. Discovered
 * candidates are written to work_items and announced on the candidate queue for the processor Worker.
 * Skips discovery while the API budget breaker is tripped (quota-aware scheduling).
 */
export default {
  async scheduled(_event: ScheduledController, env: Env, exec: ExecutionContext): Promise<void> {
    await ensureBootstrapped(env);
    const ctx = workerCtx(env);
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
      exec.waitUntil(refreshCandidateSnapshots(ctx).then(() => expireStale(ctx)));
      ctx.log.info('discovery cycle', { ...r, errors: r.errors.slice(0, 3) });
    } catch (e) {
      await recordJob(ctx.db, 'scout', {
        now: Date.now(),
        ok: false,
        error: (e as Error).message,
        latencyMs: Date.now() - started,
        instanceId: ctx.instanceId,
      });
      throw e;
    }
  },
} satisfies ExportedHandler<Env>;
