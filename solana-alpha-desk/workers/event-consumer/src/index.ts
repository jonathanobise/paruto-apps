import { workerCtx, type Env } from '@alpha-desk/api/worker';
import { alertStmt, auditStmt } from '@alpha-desk/orchestrator';

/** Dead-letter queue consumer: no message is dropped silently — each becomes an alert and an audit record. */
export default {
  async queue(batch: MessageBatch<unknown>, env: Env): Promise<void> {
    const ctx = workerCtx(env);
    const now = Date.now();
    const stmts = [];
    for (const m of batch.messages) {
      const body = JSON.stringify(m.body).slice(0, 1000);
      stmts.push(
        alertStmt(
          'WARNING',
          'queue:dlq',
          'Queue message dead-lettered',
          `${m.id}: ${body}`,
          now,
          `dlq:${m.id}`,
        ),
      );
      stmts.push(
        await auditStmt({
          category: 'AUTOMATION',
          action: 'DLQ_MESSAGE',
          actor: 'SYSTEM',
          subjectType: 'queue_message',
          subjectId: m.id,
          detail: { body, attempts: m.attempts },
          at: now,
        }),
      );
    }
    if (stmts.length) await ctx.db.batch(stmts);
    batch.ackAll();
  },
} satisfies ExportedHandler<Env>;
