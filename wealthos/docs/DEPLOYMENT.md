# Deployment

**Not deployed.** Production deployment, paid services and vendor commitments need the owner's approval.

## Target shape (proposal)
- **App:** Node 22 runtime for Next.js (`next build` → `next start`), e.g. a container platform or Vercel. Must reach Postgres over TLS.
- **Database:** managed PostgreSQL 16 with PITR backups, encryption at rest, private networking. Data residency (Nigeria vs EU/US region) is a legal decision (NDPA cross-border rules).
- **Roles:** run `scripts/sql/bootstrap-roles.sql` equivalent; migrations with the owner role in CI/CD; app with the runtime role (NOBYPASSRLS). Never give the app owner credentials.
- **Secrets:** `DATABASE_URL`, `DATABASE_OWNER_URL` (CI only), `APP_ENCRYPTION_KEY` (32 bytes), `APP_ORIGIN`, `SCRYPT_LOG_N=17`, email provider credentials (adapter to be written; `EMAIL_TRANSPORT=outbox` is development-only and logs a warning in production). Optional: `ANTHROPIC_API_KEY` (research assistant; leaving it unset shows "not connected"), `AI_MODEL`, `AI_FALLBACK_MODEL`, `AI_ORG_MONTHLY_TOKEN_BUDGET`. Never set `AI_PROVIDER=test` outside test environments (production refuses it).
- **Edge:** HTTPS only (the app sends HSTS when `APP_ORIGIN` is https and a nonce-based CSP on every page), WAF/rate limiting in front of auth routes.
- **Worker:** run `npm run worker` as a separate long-running process (or `npm run worker -- --once` from a scheduler every few minutes). It needs the same `DATABASE_URL` as the app. Jobs live in Postgres; no extra infrastructure.
- **Object storage:** R2-compatible bucket for reports/imports (M4).
- **Observability:** OpenTelemetry traces, error monitoring, uptime check on `/api/health`.

## Container, CI and operations
- `Dockerfile` builds one image for the app (`npx next start`), the worker (`npm run worker`) and migrations (`npm run db:migrate`); the build needs no secrets (verified). Not built in this environment (no Docker available).
- `ci/github-actions.yml`: typecheck, lint, unit, integration, E2E, perf and audit against Postgres 16. **Inactive** until copied to `.github/workflows/` at the repository root (it uses GitHub Actions minutes).
- Client IP: set `TRUSTED_PROXY_HOPS` (number of proxies in front of the app) or `TRUSTED_IP_HEADER` (e.g. `cf-connecting-ip`); production refuses to start otherwise.
- Health: `/api/health` (liveness), `/api/health?deep=1` (readiness: migration, worker heartbeat, dead jobs).
- Logs: structured JSON on stdout with request ids (`x-request-id`); server errors via `src/instrumentation.ts`.
- Payment notifications: `/api/billing/webhook/{provider}` (no provider registered). Never set `BILLING_TEST_WEBHOOK_SECRET` or `AI_PROVIDER=test` in production (both refused).
- Runbook: docs/RUNBOOK.md. Security review: docs/SECURITY_REVIEW.md.

## Release checklist
1. `npm run check` and `npm run test:e2e` green.
2. Migrations reviewed; backup taken; `npm run db:migrate` with owner role.
3. Never run `db:seed-demo` in production (the script refuses when `NODE_ENV=production`).
4. Compliance approvals recorded for any `pending_review` feature to be enabled. For the research assistant also: vendor DPA, spend cap, and a passing `npm run ai:eval -- --yes` run (docs/AI_SAFETY.md).
5. Smoke test: sign-up → verify → record → dashboard.

## Backup & disaster recovery (to finalise)
RPO ≤ 15 min (WAL/PITR), RTO ≤ 4 h. Quarterly restore drill into an isolated environment; verify RLS and row counts after restore. Encryption key escrow for `APP_ENCRYPTION_KEY` (losing it disables MFA secrets, not financial data).

## This repository
WealthOS lives in `wealthos/` inside `jonathanobise/paruto-apps`. The repo root `.assetsignore` excludes it from the apps.paruto.com static publish. It can be split into its own repository with `git subtree split --prefix=wealthos`.
