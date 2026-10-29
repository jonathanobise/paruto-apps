import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DEFAULT_STRATEGY } from '@alpha-desk/config';
import { BridgeDb, type SqlDb } from '@alpha-desk/db';
import { migrateNodeDb, NodeSqliteDb } from '@alpha-desk/db/node';
import { bootstrap, CreditLedger, loadConfig, ProviderMetrics, type Ctx } from '@alpha-desk/orchestrator';
import { createProviders, SolPrice } from '@alpha-desk/providers';
import { createLogger, newId, systemClock } from '@alpha-desk/shared';
import type { MonitorEnv } from './env.ts';
import { FileEvidenceStore } from './file-store.ts';

export const MIGRATIONS_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../infrastructure/migrations',
);

export async function openDb(env: MonitorEnv): Promise<SqlDb> {
  if (env.BRIDGE_URL) return new BridgeDb(env.BRIDGE_URL, env.BRIDGE_SECRET!);
  mkdirSync(dirname(resolve(env.DATABASE_PATH)), { recursive: true });
  const db = new NodeSqliteDb(env.DATABASE_PATH);
  await migrateNodeDb(db, process.env.MIGRATIONS_DIR ?? MIGRATIONS_DIR);
  return db;
}

export async function buildContext(
  env: MonitorEnv,
): Promise<{ ctx: Ctx; metrics: ProviderMetrics; providers: ReturnType<typeof createProviders> }> {
  const log = createLogger({ service: 'monitor' }, env.LOG_LEVEL);
  const db = await openDb(env);
  const metrics = new ProviderMetrics();
  const providers = createProviders(env, {
    onMetric: metrics.record,
    credits: new CreditLedger(db, systemClock),
  });
  await bootstrap(db, {
    config: DEFAULT_STRATEGY,
    env,
    ownerEmail: env.OWNER_EMAIL,
    now: Date.now(),
    actor: 'SYSTEM',
    initialMode: env.INITIAL_MODE,
    timezone: env.TIMEZONE,
  });
  let cached: { at: number; value: Awaited<ReturnType<typeof loadConfig>> } | null = null;
  const ctx: Ctx = {
    db,
    providers,
    solPrice: new SolPrice(providers.jupiter),
    evidenceStore: new FileEvidenceStore(env.EVIDENCE_DIR),
    clock: systemClock,
    log,
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    config: async () => {
      if (!cached || Date.now() - cached.at > 10_000)
        cached = { at: Date.now(), value: await loadConfig(db) };
      return cached.value;
    },
    instanceId: newId('mon'),
  };
  return { ctx, metrics, providers };
}
