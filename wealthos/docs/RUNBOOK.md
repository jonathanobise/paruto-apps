# Operations runbook

WealthOS is **not deployed**. This is the runbook for when it is. Production deployment, paid services and vendor contracts need the owner's approval first (docs/DEPLOYMENT.md).

## Components
| Process | Command | Notes |
|---|---|---|
| Web app | `npx next start --port 3100` (Docker default command) | Stateless; scale horizontally. Health: `/api/health` (liveness), `/api/health?deep=1` (readiness: migration, worker heartbeat, dead jobs) |
| Worker | `npm run worker` (or `npm run worker -- --once` from a scheduler every few minutes) | Alert evaluation, billing lifecycle, daily bank-connection syncs. Safe to run several copies (SKIP LOCKED + dedupe keys) |
| Migrations | `npm run db:migrate` with `DATABASE_OWNER_URL` | Run before releasing a new app version; owner role only |
| Database | PostgreSQL 16 | Roles from `scripts/sql/bootstrap-roles.sql`; app uses the NOBYPASSRLS runtime role |

## Environment
Required: `DATABASE_URL` (runtime role), `APP_ENCRYPTION_KEY` (32 bytes base64; losing it disables MFA secrets, not financial data), `APP_ORIGIN` (https URL), `APP_ENV=production`, and **either** `TRUSTED_PROXY_HOPS` (number of reverse proxies in front of the app that append to X-Forwarded-For) **or** `TRUSTED_IP_HEADER` (e.g. `cf-connecting-ip`) — production refuses to start without one, because rate limits and security logs depend on the client IP.
Optional: `SCRYPT_LOG_N` (17), `EMAIL_TRANSPORT` (only development transports exist), `ANTHROPIC_API_KEY` + `AI_MODEL` + `AI_FALLBACK_MODEL` + `AI_ORG_MONTHLY_TOKEN_BUDGET` (research assistant; see AI_SAFETY.md before setting).
Never in production: `AI_PROVIDER=test`, `BILLING_TEST_WEBHOOK_SECRET`, `CONNECTIONS_SANDBOX=1` (all refused when `APP_ENV=production`).

## Release
1. `npm run check`, `npm run test:e2e`, `npm audit --omit=dev` green (CI file: `ci/github-actions.yml`, not yet enabled).
2. Review new migrations; take a backup / confirm PITR.
3. `npm run db:migrate` (owner role). Migrations are additive; destructive changes follow expand → backfill → contract.
4. Deploy the image; wait for `/api/health?deep=1`.
5. Smoke: sign in, dashboard, record a transaction, open a report. Watch logs for `request.error`.

## Routine tasks
- **Grant/revoke staff roles:** `npx tsx scripts/grant-admin.ts someone@example.com [--role support|compliance] [--revoke]` (owner role; default role is admin). Staff must enable two-step verification before access works.
- **Record a compliance decision:** compliance reviewers use Admin → Feature gates; or  `npx tsx --conditions=react-server scripts/record-compliance-decision.ts --feature KEY --status approved|rejected|suspended|pending_review --reviewer reviewer@example.com --reference "memo"`. Append-only; hard-disabled features can't be approved.
- **Reconcile a bank-transfer payment:** Admin → Billing (or the organisation) → invoice → *Record payment* with the bank reference and exact amount. Mismatches are refused; ask the customer or void and reissue.
- **Complimentary plan:** Admin → Organisations → organisation → *Grant complimentary plan* (reason required).
- **Dead jobs:** Admin → Jobs → Failed → read the error, fix the cause, *Retry*.
- **Stale market data:** Admin → Overview → Source freshness; import new data in Admin → Market data. No live feeds exist.
- **Support:** Admin → Support. Never ask for passwords, codes or bank logins; no personal investment advice.
- **Suspected account compromise:** Admin → Users → user → *Sign out everywhere*; ask the user to reset their password; check Security events.

## Incidents
| Signal | First steps |
|---|---|
| `/api/health` 503 (`db: unreachable`) | Check database status/credentials/network; the app degrades to errors, no data is written |
| `?deep=1` worker not ok | Is the worker running? Check its logs; jobs wait in Postgres and are processed when it returns |
| Many `request.error` logs | Correlate by `requestId` (also in the `x-request-id` response header); roll back the release if new |
| Suspected data exposure | Preserve logs and audit events (append-only); revoke sessions; assess under NDPA breach rules (notify NDPC within 72 hours where required) |
| Wrong figures reported | Reproduce with the user's permission via support; analytics caches can be truncated safely (`valuation_snapshots` is derived) |

## Backups and recovery
RPO ≤ 15 minutes (WAL/PITR), RTO ≤ 4 hours. Quarterly restore drill into an isolated environment: restore, run migrations status, run `tests/integration/tenancy.test.ts`-style checks (RLS on every `org_id` table), compare row counts. Escrow `APP_ENCRYPTION_KEY` separately from backups.

## Data protection operations
- Export: users download their own data (Settings → Privacy). Erasure: Settings → Privacy → delete account (solely-owned organisations deleted; personal rows in shared spaces removed; invoices kept without org link).
- Logs: structured JSON; never log secrets, tokens, amounts or user free text. Retention schedule to be set with counsel.
