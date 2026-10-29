import { D1Db, type D1Like } from '@alpha-desk/db';
import { DEFAULT_STRATEGY } from '@alpha-desk/config';
import {
  CreditLedger,
  bootstrap,
  loadConfig,
  R2EvidenceStore,
  type Ctx,
  type ProviderMetrics,
  type QueueName,
} from '@alpha-desk/orchestrator';
import { createProviders, SolPrice } from '@alpha-desk/providers';
import { createLogger, newId, systemClock } from '@alpha-desk/shared';
import { createApp } from './app.ts';
import { serveWeb } from './web.ts';

export interface Env {
  DB: D1Database;
  EVIDENCE: R2Bucket;
  CANDIDATE_QUEUE?: Queue<{ queue: QueueName }>;
  BRIDGE_SECRET?: string;
  SETUP_TOKEN?: string;
  SOLANA_RPC_URL?: string;
  JUPITER_API_KEY?: string;
  HELIUS_API_KEY?: string;
  APP_ENV?: 'development' | 'test' | 'production';
}

export function workerCtx(env: Env, metrics?: ProviderMetrics): Ctx {
  const db = new D1Db(env.DB as unknown as D1Like);
  const providers = createProviders(env, {
    ...(metrics ? { onMetric: metrics.record } : {}),
    credits: new CreditLedger(db, systemClock),
  });
  return {
    db,
    providers,
    solPrice: new SolPrice(providers.jupiter),
    evidenceStore: new R2EvidenceStore(env.EVIDENCE as never),
    clock: systemClock,
    log: createLogger({ service: 'api' }),
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    config: () => loadConfig(db),
    instanceId: newId('api'),
    notify: env.CANDIDATE_QUEUE
      ? async (queue, delaySeconds) => void (await env.CANDIDATE_QUEUE!.send({ queue }, { delaySeconds }))
      : undefined,
  };
}

const app = createApp((c) => {
  const env = c.env as Env;
  const ctx = workerCtx(env);
  return {
    db: ctx.db,
    ctx: () => ctx,
    evidence: ctx.evidenceStore,
    env: {
      BRIDGE_SECRET: env.BRIDGE_SECRET,
      SETUP_TOKEN: env.SETUP_TOKEN,
      APP_ENV: env.APP_ENV ?? 'production',
      COOKIE_SECURE: true,
    },
    now: () => Date.now(),
  };
});

let booted: Promise<void> | null = null;

/** First request on a fresh D1 database creates the runtime row, strategy, owner record and portfolio. */
export function ensureBootstrapped(env: Env): Promise<void> {
  booted ??= (async () => {
    const db = new D1Db(env.DB as unknown as D1Like);
    const rt = await db.first<{ id: number }>('SELECT id FROM runtime_state WHERE id = 1').catch(() => null);
    if (!rt) {
      await bootstrap(db, {
        config: DEFAULT_STRATEGY,
        env,
        ownerEmail: 'owner@localhost.localdomain',
        now: Date.now(),
        actor: 'SYSTEM',
        initialMode: 'DISCOVERY_ONLY',
      });
    }
  })().catch((e) => {
    booted = null;
    throw e;
  });
  return booted;
}

export default {
  async fetch(req: Request, env: Env, exec: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/internal/')) {
      await ensureBootstrapped(env);
      return app.fetch(req, env, exec);
    }
    return serveWeb(req);
  },
} satisfies ExportedHandler<Env>;
