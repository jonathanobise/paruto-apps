import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_STRATEGY } from '@alpha-desk/config';
import { migrateNodeDb, NodeSqliteDb } from '@alpha-desk/db/node';
import { bootstrap, loadConfig, type Ctx } from '@alpha-desk/orchestrator';
import { createProviders, SolPrice } from '@alpha-desk/providers';
import { createLogger, newId, systemClock } from '@alpha-desk/shared';
import { FileEvidenceStore } from '../../monitor/src/file-store.ts';
import { createApp } from './app.ts';

/**
 * Local server: the same API as the Worker, on node:sqlite + filesystem evidence, plus the static dashboard
 * export. Used for development, single-host operation next to `pnpm monitor`, and end-to-end tests.
 */
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const dbPath = resolve(root, process.env.DATABASE_PATH ?? 'data/alpha-desk.sqlite');
mkdirSync(dirname(dbPath), { recursive: true });
const db = new NodeSqliteDb(dbPath);
await migrateNodeDb(db, resolve(root, 'infrastructure/migrations'));
await bootstrap(db, {
  config: DEFAULT_STRATEGY,
  env: process.env,
  ownerEmail: process.env.OWNER_EMAIL ?? 'owner@localhost.localdomain',
  now: Date.now(),
  actor: 'SYSTEM',
  initialMode: 'DISCOVERY_ONLY',
  timezone: process.env.TIMEZONE ?? 'UTC',
});
const providers = createProviders(process.env);
const evidence = new FileEvidenceStore(resolve(root, process.env.EVIDENCE_DIR ?? 'data/evidence'));
const ctx: Ctx = {
  db,
  providers,
  solPrice: new SolPrice(providers.jupiter),
  evidenceStore: evidence,
  clock: systemClock,
  log: createLogger({ service: 'api-local' }),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  config: () => loadConfig(db),
  instanceId: newId('api'),
};
const appEnv = (process.env.APP_ENV as 'development' | 'test' | 'production' | undefined) ?? 'development';
const api = createApp(() => ({
  db,
  ctx: () => ctx,
  evidence,
  env: {
    BRIDGE_SECRET: process.env.BRIDGE_SECRET,
    SETUP_TOKEN: process.env.SETUP_TOKEN,
    APP_ENV: appEnv,
    COOKIE_SECURE: process.env.COOKIE_SECURE === 'true',
  },
  now: () => Date.now(),
}));

const server = new Hono();
server.route('/', api);
const webOut = resolve(root, 'apps/web/out');
if (existsSync(webOut)) {
  const rel = relative(process.cwd(), webOut) || '.';
  server.use('/*', serveStatic({ root: rel }));
  server.get('*', serveStatic({ path: `${rel}/index.html` }));
}
const port = Number(process.env.PORT ?? 8787);
serve({ fetch: server.fetch, port, hostname: process.env.HOST ?? '127.0.0.1' });
console.log(JSON.stringify({ level: 'info', msg: 'api listening', port, web: existsSync(webOut) }));
