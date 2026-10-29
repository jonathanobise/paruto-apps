# Deployment

**Status: not deployed.** Nothing has been created on Cloudflare. Deploying creates billable resources on
the owner's account and publishes a login page, so it waits for the owner's go-ahead.

## Target topology

- **Control plane** — Worker `solana-alpha-desk-api` (`apps/api`): REST API, auth, the signed bridge,
  and the dashboard as static assets on the same origin. Bindings: D1 `DB`, R2 `EVIDENCE`, queue producer
  `CANDIDATE_QUEUE`. Suggested route: a private hostname such as `desk.paruto.com` behind Cloudflare
  Access (defence in depth on top of the app's own auth). `workers_dev` is off.
- **Data plane (optional)** — `workers/discovery-scheduler` (cron every minute), `workers/candidate-processor`
  (queue consumer: filter + analyst), `workers/event-consumer` (dead-letter queue → alerts). When these
  run, start the monitor with `RUN_PIPELINE=false`.
- **Execution plane** — the monitor container (`infrastructure/docker`) on an always-on host (Fly.io,
  Railway, a VPS…) with `APP_ENV=production`, `BRIDGE_URL`, `BRIDGE_SECRET`. It runs risk, entries,
  exits, stops, breakers, reconciliation, reports and retention, and writes D1 through the bridge.

## Steps

1. Create resources (once): `infrastructure/cloudflare/setup.sh` (D1, R2, queues). Paste the D1 id into
   `apps/api/wrangler.jsonc` and `workers/*/wrangler.jsonc`.
2. Migrate: `cd apps/api && npx wrangler d1 migrations apply solana-alpha-desk --remote`.
3. Secrets on the API Worker: `SETUP_TOKEN`, `BRIDGE_SECRET` (≥ 32 random chars); optional
   `SOLANA_RPC_URL`, `JUPITER_API_KEY`, `HELIUS_API_KEY` (also on the data-plane Workers).
4. Build and deploy from a clean checkout of the branch to deploy:
   `pnpm install --frozen-lockfile && pnpm web:build && (cd apps/api && npx wrangler deploy)`;
   optionally `(cd workers/<name> && npx wrangler deploy)` for each data-plane Worker.
5. Open the hostname, complete owner setup with the setup token, enrol MFA (Settings → Security).
6. Start the monitor: `docker compose -f infrastructure/docker/compose.yml --env-file monitor.env up -d`
   (or the systemd unit). Check `/healthz` from the host and System Health in the dashboard.
7. Switch the runtime mode from DISCOVERY_ONLY to PAPER_AUTONOMOUS only once System Health is green and
   at least the RPC and indexer credentials are configured.

## Verified locally

- `wrangler d1 migrations apply --local` applies all migrations.
- `wrangler dev` runs the API Worker on workerd with local D1: first-run bootstrap, setup, login, the
  overview endpoint and the static dashboard all work.
- The monitor in production topology (`BRIDGE_URL` → `wrangler dev`) ran live discovery against mainnet
  data through the signed bridge with zero errors.
- The full paper lifecycle test passes on a real D1 binding (`tests/integration/d1.test.ts`).
- The bundled monitor (`apps/monitor/dist/monitor.mjs`) starts and serves `/healthz`.

Not verified: a Docker image build (no Docker daemon in the build environment), and anything on
Cloudflare's network.

## Rollback

Workers keep previous versions: `npx wrangler rollback` (API) restores the last deployment. D1
migrations are additive; restore data with D1 Time Travel (`wrangler d1 time-travel restore`). Stop the
monitor first so it does not write during a restore.
