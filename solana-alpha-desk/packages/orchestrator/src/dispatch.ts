import { processAnalyst } from './analyst-stage.ts';
import type { Ctx } from './context.ts';
import { processEntry, processExit, processRisk } from './execution-stage.ts';
import { processFilter } from './filter-stage.ts';
import { complete, defer, fail, lease, type QueueName, type WorkItem } from './queue.ts';
import { recordJob } from './health.ts';
import type { StageResult } from './stage-result.ts';

const AGENT_OF: Record<QueueName, string> = {
  filter: 'filter',
  analyst: 'analyst',
  risk: 'risk',
  execute: 'executor',
  exit: 'executor',
};

/** Runs one queue message through its agent. Shared by the Node monitor and the Cloudflare queue consumer. */
export async function handle(
  ctx: Ctx,
  queue: QueueName,
  payload: { candidateId?: string; authorizationId?: string; positionId?: string },
): Promise<StageResult> {
  switch (queue) {
    case 'filter':
      return processFilter(ctx, payload.candidateId!);
    case 'analyst':
      return processAnalyst(ctx, payload.candidateId!);
    case 'risk':
      return processRisk(ctx, payload.candidateId!);
    case 'execute':
      return processEntry(ctx, payload.candidateId!, payload.authorizationId!);
    case 'exit':
      return processExit(ctx, payload.positionId!);
  }
}

/** Leases and processes ready items of one queue; failures retry with backoff and finally dead-letter. */
export async function drainQueue(ctx: Ctx, queue: QueueName, limit = 5): Promise<number> {
  const items = await lease(ctx.db, queue, ctx.clock.now(), 120_000, limit);
  for (const item of items) await runItem(ctx, item);
  return items.length;
}

async function runItem(ctx: Ctx, item: WorkItem): Promise<void> {
  const started = ctx.clock.now();
  try {
    const res = await handle(ctx, item.queue, JSON.parse(item.payload));
    if (res.kind === 'DEFER') await defer(ctx.db, item.id, res.untilMs, ctx.clock.now());
    else await complete(ctx.db, item.id, ctx.clock.now());
    await recordJob(ctx.db, AGENT_OF[item.queue], {
      now: ctx.clock.now(),
      ok: true,
      error: null,
      processed: res.kind === 'DONE' ? 1 : 0,
      rejected: res.kind === 'DONE' && /REJECTED|UNVERIFIED|ERROR|PAUSED/.test(res.state) ? 1 : 0,
      latencyMs: ctx.clock.now() - started,
      instanceId: ctx.instanceId,
    });
  } catch (e) {
    const msg = (e as Error).message;
    ctx.log.error('work item failed', { queue: item.queue, id: item.id, error: msg });
    const outcome = await fail(ctx.db, item, msg, ctx.clock.now());
    await recordJob(ctx.db, AGENT_OF[item.queue], {
      now: ctx.clock.now(),
      ok: false,
      error: `${outcome}: ${msg}`.slice(0, 500),
      latencyMs: ctx.clock.now() - started,
      instanceId: ctx.instanceId,
    });
  }
}
