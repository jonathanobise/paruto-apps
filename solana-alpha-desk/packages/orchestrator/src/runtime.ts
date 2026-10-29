import { HOUR, DAY } from '@alpha-desk/shared';
import type { Ctx } from './context.ts';
import { drainQueue } from './dispatch.ts';
import { recordJob, recordStart, type ProviderMetrics } from './health.ts';
import {
  equityAndBreakers,
  expireStale,
  monitorPositions,
  MonitorMemory,
  recoverAfterRestart,
  refreshCandidateSnapshots,
  runReconciliation,
} from './monitor-stage.ts';
import { queueDepths } from './queue.ts';
import { generateReport } from './reports.ts';
import { activeBreakers, getRuntime } from './repo.ts';
import { runDiscoveryCycle } from './scout-stage.ts';
import { localDate } from './bootstrap.ts';

/** Serialises execution-plane work (entries, exits, stop handling) inside one process. */
class Mutex {
  private tail: Promise<void> = Promise.resolve();
  run<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.tail.then(fn, fn);
    this.tail = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }
}

export interface RuntimeOptions {
  metrics: ProviderMetrics;
  circuits: () => Record<string, string>;
  /** Run discovery and the decision pipeline (false when Cloudflare cron + queues do that). */
  runPipeline: boolean;
}

/**
 * The persistent agent runtime (apps/monitor). Each loop runs on its own cadence, never overlaps itself,
 * records a heartbeat and survives errors. Position protection keeps running when entries are paused.
 */
export class AgentRuntime {
  private timers: ReturnType<typeof setTimeout>[] = [];
  private stopped = false;
  private readonly exec = new Mutex();
  private readonly mem = new MonitorMemory();

  constructor(
    private readonly ctx: Ctx,
    private readonly opts: RuntimeOptions,
  ) {}

  async start(): Promise<void> {
    const now = this.ctx.clock.now();
    await recordStart(this.ctx.db, 'monitor', this.ctx.instanceId, now);
    const rec = await recoverAfterRestart(this.ctx);
    this.ctx.log.info('recovery completed', rec);
    const cfg = (await this.ctx.config()).config;

    this.loop('scout', cfg.discovery.pollIntervalSeconds * 1000, async () => {
      if (!this.opts.runPipeline) return;
      const pid = (await getRuntime(this.ctx.db)).active_portfolio_id;
      if (pid && (await activeBreakers(this.ctx.db, pid)).includes('API_BUDGET')) return;
      const r = await runDiscoveryCycle(this.ctx);
      this.ctx.log.info('discovery cycle', { ...r, errors: r.errors.slice(0, 3) });
    });
    this.loop('pipeline', 2_000, async () => {
      if (!this.opts.runPipeline) return;
      await drainQueue(this.ctx, 'filter', 2);
      await drainQueue(this.ctx, 'analyst', 5);
      await this.exec.run(async () => {
        await drainQueue(this.ctx, 'risk', 2);
        await drainQueue(this.ctx, 'execute', 2);
        await drainQueue(this.ctx, 'exit', 3);
      });
    });
    this.loop('positions', cfg.monitoring.positionPollMs, async () => {
      const r = await this.exec.run(() => monitorPositions(this.ctx, this.mem));
      await recordJob(this.ctx.db, 'position-monitor', {
        now: this.ctx.clock.now(),
        ok: true,
        error: null,
        processed: r.checked,
        instanceId: this.ctx.instanceId,
      });
    });
    this.loop('snapshots', cfg.monitoring.candidateSnapshotSeconds * 1000, async () => {
      if (this.opts.runPipeline) await refreshCandidateSnapshots(this.ctx);
    });
    this.loop('equity', 60_000, () =>
      this.exec.run(() =>
        equityAndBreakers(this.ctx, { apiCallsToday: this.opts.metrics.totalCallsToday() }),
      ),
    );
    this.loop('expiry', 30_000, async () => {
      await expireStale(this.ctx);
    });
    this.loop('reconcile', 5 * 60_000, async () => {
      await this.exec.run(() => runReconciliation(this.ctx));
    });
    this.loop('metrics', 30_000, () => this.opts.metrics.flush(this.ctx.db, this.opts.circuits()));
    this.loop('heartbeat', 15_000, async () => {
      const depths = await queueDepths(this.ctx.db);
      await recordJob(this.ctx.db, 'monitor', {
        now: this.ctx.clock.now(),
        ok: true,
        error: null,
        queueDepth: Object.values(depths).reduce((a, b) => a + b, 0),
        instanceId: this.ctx.instanceId,
      });
    });
    this.loop('reports', 5 * 60_000, () => this.scheduledReports());
  }

  stop(): void {
    this.stopped = true;
    for (const t of this.timers) clearTimeout(t);
  }

  private loop(name: string, everyMs: number, fn: () => Promise<unknown>): void {
    const tick = async () => {
      if (this.stopped) return;
      const started = this.ctx.clock.now();
      try {
        await fn();
      } catch (e) {
        this.ctx.log.error(`loop ${name} failed`, { error: (e as Error).message });
        await recordJob(this.ctx.db, `loop:${name}`, {
          now: this.ctx.clock.now(),
          ok: false,
          error: (e as Error).message.slice(0, 500),
          instanceId: this.ctx.instanceId,
        }).catch(() => undefined);
      }
      if (!this.stopped)
        this.timers.push(setTimeout(tick, Math.max(250, everyMs - (this.ctx.clock.now() - started))));
    };
    this.timers.push(setTimeout(tick, 100));
  }

  /** Morning report at the configured local hour, daily P&L and funnel for the previous local day, weekly on Mondays. */
  private async scheduledReports(): Promise<void> {
    const rt = await getRuntime(this.ctx.db);
    const now = this.ctx.clock.now();
    const hour = Number(
      new Intl.DateTimeFormat('en-GB', { timeZone: rt.timezone, hour: '2-digit', hour12: false }).format(
        new Date(now),
      ),
    );
    if (hour !== rt.report_hour_local) return;
    const today = localDate(now, rt.timezone);
    const done = await this.ctx.db.first<{ n: number }>(
      `SELECT COUNT(*) AS n FROM report_runs WHERE kind = 'MORNING' AND created_at > ?`,
      [now - 20 * HOUR],
    );
    if (Number(done?.n ?? 0) > 0) return;
    const end = now;
    await generateReport(this.ctx, 'MORNING', end - DAY, end);
    await generateReport(this.ctx, 'DAILY_PNL', end - DAY, end);
    await generateReport(this.ctx, 'REJECTION_FUNNEL', end - DAY, end);
    await generateReport(this.ctx, 'AGENT_RELIABILITY', end - DAY, end);
    const weekday = new Intl.DateTimeFormat('en-GB', { timeZone: rt.timezone, weekday: 'short' }).format(
      new Date(now),
    );
    if (weekday === 'Mon') {
      await generateReport(this.ctx, 'WEEKLY', end - 7 * DAY, end);
      await generateReport(this.ctx, 'STRATEGY_COMPARISON', end - 7 * DAY, end);
    }
    this.ctx.log.info('scheduled reports generated', { day: today });
  }
}
