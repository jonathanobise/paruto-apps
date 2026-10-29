import { createServer } from 'node:http';
import { AgentRuntime, getRuntime, queueDepths } from '@alpha-desk/orchestrator';
import { buildContext } from './context.ts';
import { loadEnv } from './env.ts';

const env = loadEnv();
const { ctx, metrics, providers } = await buildContext(env);
const runtime = new AgentRuntime(ctx, {
  metrics,
  runPipeline: env.RUN_PIPELINE === 'true',
  circuits: () => ({ dexscreener: providers.dex.circuit, jupiter: providers.jupiter.circuit, 'solana-rpc': providers.rpc.circuit }),
});
await runtime.start();
ctx.log.info('monitor started', { instanceId: ctx.instanceId, pipeline: env.RUN_PIPELINE, db: ctx.db.driver });

// Liveness/readiness for the container supervisor. Exposes no data beyond status.
const server = createServer(async (req, res) => {
  if (req.url === '/healthz') {
    try {
      const rt = await getRuntime(ctx.db);
      const depths = await queueDepths(ctx.db);
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ status: 'HEALTHY', mode: rt.mode, queues: depths, instanceId: ctx.instanceId }));
    } catch (e) {
      res.writeHead(503, { 'content-type': 'application/json' }).end(JSON.stringify({ status: 'UNAVAILABLE', error: (e as Error).message }));
    }
    return;
  }
  res.writeHead(404).end();
});
server.listen(env.HEALTH_PORT, '127.0.0.1');

const shutdown = (signal: string) => {
  ctx.log.info('shutting down', { signal });
  runtime.stop();
  server.close();
  setTimeout(() => process.exit(0), 500).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (e) => ctx.log.error('unhandled rejection', { error: String(e) }));
