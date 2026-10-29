import { DurableObject } from 'cloudflare:workers';
import { ensureBootstrapped, workerCtx, type Env as ApiEnv } from '@alpha-desk/api/worker';
import { ExecutionTicker, ProviderMetrics } from '@alpha-desk/orchestrator';

interface Env extends ApiEnv {
  ENGINE: DurableObjectNamespace<ExecutionEngine>;
}

/**
 * The execution plane on Cloudflare: one Durable Object ("primary") that wakes itself with alarms every
 * ~2 s to mark positions, move stops, process risk/entry/exit work, run breakers, reconciliation, reports
 * and retention. A Durable Object runs one alarm at a time, which serialises the execution plane exactly
 * like the Node monitor's mutex. The cron trigger re-arms it every minute in case an alarm is ever lost.
 */
export class ExecutionEngine extends DurableObject<Env> {
  private ticker: ExecutionTicker | null = null;
  private metrics = new ProviderMetrics();

  private engine(): ExecutionTicker {
    if (!this.ticker) {
      const ctx = workerCtx(this.env, this.metrics);
      this.ticker = new ExecutionTicker(ctx, this.metrics, () => ({}));
    }
    return this.ticker;
  }

  override async alarm(): Promise<void> {
    let next = 2_000;
    try {
      await ensureBootstrapped(this.env);
      next = await this.engine().tick();
    } catch (e) {
      console.error(
        JSON.stringify({ level: 'error', msg: 'engine tick failed', error: (e as Error).message }),
      );
      next = 10_000;
    } finally {
      await this.ctx.storage.setAlarm(Date.now() + next);
    }
  }

  /** Arms the alarm if it is not already set. */
  async ensure(): Promise<{ armed: boolean; next: number | null }> {
    const current = await this.ctx.storage.getAlarm();
    if (current === null || current < Date.now() - 60_000) await this.ctx.storage.setAlarm(Date.now() + 500);
    return { armed: true, next: await this.ctx.storage.getAlarm() };
  }
}

export default {
  async scheduled(_event: ScheduledController, env: Env): Promise<void> {
    await env.ENGINE.get(env.ENGINE.idFromName('primary')).ensure();
  },
  async fetch(): Promise<Response> {
    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
