import type { Ctx } from './context.ts';
import { drainQueue } from './dispatch.ts';
import { recordJob, recordStart, type ProviderMetrics } from './health.ts';
import {
  equityAndBreakers,
  expireStale,
  monitorPositions,
  MonitorMemory,
  recoverAfterRestart,
  runReconciliation,
} from './monitor-stage.ts';
import { queueDepths } from './queue.ts';
import { runRetention } from './retention.ts';
import { runScheduledReports } from './runtime.ts';

/**
 * The execution plane as a re-entrant tick, for hosts that call it on a timer instead of running loops
 * (the Cloudflare Durable Object). One tick at a time — the caller serialises — so entries, exits and stop
 * updates never interleave. Recovery runs on the first tick of every new instance.
 */
export class ExecutionTicker {
  private last = new Map<string, number>();
  private recovered = false;
  readonly mem = new MonitorMemory();

  constructor(
    private readonly ctx: Ctx,
    private readonly metrics: ProviderMetrics | null,
    private readonly circuits: () => Record<string, string> = () => ({}),
  ) {}

  private due(name: string, everyMs: number, now: number): boolean {
    if (now - (this.last.get(name) ?? 0) < everyMs) return false;
    this.last.set(name, now);
    return true;
  }

  private async step(name: string, fn: () => Promise<unknown>): Promise<void> {
    try {
      await fn();
    } catch (e) {
      this.ctx.log.error(`tick ${name} failed`, { error: (e as Error).message });
      await recordJob(this.ctx.db, `loop:${name}`, {
        now: this.ctx.clock.now(),
        ok: false,
        error: (e as Error).message.slice(0, 500),
        instanceId: this.ctx.instanceId,
      }).catch(() => undefined);
    }
  }

  /** Runs whatever is due and returns the delay until the next tick. */
  async tick(): Promise<number> {
    const { config } = await this.ctx.config();
    if (!this.recovered) {
      await recordStart(this.ctx.db, 'monitor', this.ctx.instanceId, this.ctx.clock.now());
      const r = await recoverAfterRestart(this.ctx);
      this.ctx.log.info('recovery completed', r);
      this.recovered = true;
    }
    const now = () => this.ctx.clock.now();
    await this.step('positions', async () => {
      const r = await monitorPositions(this.ctx, this.mem);
      if (this.due('positions-heartbeat', 15_000, now()))
        await recordJob(this.ctx.db, 'position-monitor', {
          now: now(),
          ok: true,
          error: null,
          processed: r.checked,
          instanceId: this.ctx.instanceId,
        });
    });
    await this.step('execution', async () => {
      await drainQueue(this.ctx, 'risk', 2);
      await drainQueue(this.ctx, 'execute', 2);
      await drainQueue(this.ctx, 'exit', 3);
    });
    if (this.due('equity', 60_000, now()))
      await this.step('equity', () =>
        equityAndBreakers(this.ctx, { apiCallsToday: this.metrics?.totalCallsToday() ?? 0 }),
      );
    if (this.due('expiry', 30_000, now())) await this.step('expiry', () => expireStale(this.ctx));
    if (this.due('reconcile', 5 * 60_000, now()))
      await this.step('reconcile', () => runReconciliation(this.ctx));
    if (this.metrics && this.due('metrics', 30_000, now()))
      await this.step('metrics', () => this.metrics!.flush(this.ctx.db, this.circuits()));
    if (this.due('heartbeat', 15_000, now())) {
      await this.step('heartbeat', async () => {
        const depths = await queueDepths(this.ctx.db);
        await recordJob(this.ctx.db, 'monitor', {
          now: now(),
          ok: true,
          error: null,
          queueDepth: Object.values(depths).reduce((a, b) => a + b, 0),
          instanceId: this.ctx.instanceId,
        });
      });
    }
    if (this.due('reports', 5 * 60_000, now()))
      await this.step('reports', () => runScheduledReports(this.ctx));
    if (this.due('retention', 6 * 3_600_000, now()))
      await this.step('retention', () => runRetention(this.ctx));
    return config.monitoring.positionPollMs;
  }
}
