# Deployment

**Status: deployed 29 Oct 2026 to https://magpie.paruto.com** (Cloudflare account
`Obise.jonathan@gmail.com's Account`, zone `paruto.com`).

| Worker                           | Role                                                                                                                                                                    | Trigger                             |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `solana-alpha-desk-api`          | API, auth, owner controls, dashboard (embedded static export)                                                                                                           | custom domain `magpie.paruto.com`   |
| `alpha-desk-execution`           | execution plane: Durable Object `ExecutionEngine` ("primary") ticking every ~2 s via alarms — risk, entries, exits, stops, breakers, reconciliation, reports, retention | cron every minute re-arms the alarm |
| `alpha-desk-discovery-scheduler` | Scout cycle, candidate snapshots, re-announces waiting work                                                                                                             | cron every minute                   |
| `alpha-desk-candidate-processor` | Filter and Analyst                                                                                                                                                      | queue `alpha-desk-candidates`       |
| `alpha-desk-event-consumer`      | dead letters → alerts                                                                                                                                                   | queue `alpha-desk-candidates-dlq`   |

Resources: D1 `solana-alpha-desk` (`e01c7217-af7a-48ad-bbb0-e8ec4a5829b9`), R2 `solana-alpha-desk-evidence`,
queues `alpha-desk-candidates` and `alpha-desk-candidates-dlq`. No Worker has a `workers.dev` or preview URL;
only the API has a route. The signed SQL bridge is disabled (no `BRIDGE_SECRET`) because the execution plane
runs on Cloudflare; set it only if you run the Node monitor elsewhere.

Secrets: `SETUP_TOKEN` on the API. `HELIUS_API_KEY` belongs on `alpha-desk-candidate-processor` and
`alpha-desk-execution` (it also provides the private Solana RPC unless `SOLANA_RPC_URL` is set).

## Why the dashboard is embedded

The build environment reaches Cloudflare through a proxy that injects the account API token, which breaks
the Workers Assets upload (it authenticates with a per-session JWT). `apps/api/scripts/embed-web.mjs`
embeds `apps/web/out` into the Worker instead (≈ 870 KB gzipped), served by `src/web.ts` with CSP, HSTS
and immutable caching for hashed assets. `pnpm --filter @alpha-desk/api deploy` runs the embed first.

## Redeploying

```bash
pnpm install --frozen-lockfile && pnpm web:build
(cd apps/api && node scripts/embed-web.mjs && npx wrangler deploy)
for w in execution-engine discovery-scheduler candidate-processor event-consumer; do (cd workers/$w && npx wrangler deploy); done
```

New migrations: `cd apps/api && npx wrangler d1 migrations apply solana-alpha-desk --remote` before deploying code that needs them.

## Original provisioning steps (for a fresh account)

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

## Verified before deployment

- `wrangler d1 migrations apply --local` applies all migrations.
- `wrangler dev` runs the API Worker on workerd with local D1: first-run bootstrap, setup, login, the
  overview endpoint and the static dashboard all work.
- The monitor in production topology (`BRIDGE_URL` → `wrangler dev`) ran live discovery against mainnet
  data through the signed bridge with zero errors.
- The full paper lifecycle test passes on a real D1 binding (`tests/integration/d1.test.ts`).
- The bundled monitor (`apps/monitor/dist/monitor.mjs`) starts and serves `/healthz`.

Not verified: a Docker image build for the optional Node monitor (no Docker daemon in the build environment).

## Rollback

Workers keep previous versions: `npx wrangler rollback` (API) restores the last deployment. D1
migrations are additive; restore data with D1 Time Travel (`wrangler d1 time-travel restore`). Stop the
monitor first so it does not write during a restore.
