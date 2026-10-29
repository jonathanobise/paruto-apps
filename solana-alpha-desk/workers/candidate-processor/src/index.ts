import { workerCtx, type Env } from '@alpha-desk/api/worker';
import { drainQueue, type QueueName } from '@alpha-desk/orchestrator';

/**
 * Queue consumer for the data plane. Messages are wake-up signals; the durable work lives in work_items,
 * so a lost or duplicated message cannot lose or duplicate work. Only filter and analyst run here — risk,
 * entries and exits stay in the monitor, which serialises the execution plane.
 */
export default {
  async queue(batch: MessageBatch<{ queue: QueueName }>, env: Env): Promise<void> {
    const ctx = workerCtx(env);
    const wanted = new Set(
      batch.messages.map((m) => m.body.queue).filter((q) => q === 'filter' || q === 'analyst'),
    );
    for (const q of wanted) {
      while ((await drainQueue(ctx, q, 3)) > 0) {
        // keep draining until the durable queue is empty
      }
    }
    batch.ackAll();
  },
} satisfies ExportedHandler<Env, { queue: QueueName }>;
