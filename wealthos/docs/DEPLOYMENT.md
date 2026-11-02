# Deployment

**Not deployed.** Production deployment, paid services and vendor commitments need the owner's approval.

## Target shape (proposal)
- **App:** Node 22 runtime for Next.js (`next build` → `next start`), e.g. a container platform or Vercel. Must reach Postgres over TLS.
- **Database:** managed PostgreSQL 16 with PITR backups, encryption at rest, private networking. Data residency (Nigeria vs EU/US region) is a legal decision (NDPA cross-border rules).
- **Roles:** run `scripts/sql/bootstrap-roles.sql` equivalent; migrations with the owner role in CI/CD; app with the runtime role (NOBYPASSRLS). Never give the app owner credentials.
- **Secrets:** `DATABASE_URL`, `DATABASE_OWNER_URL` (CI only), `APP_ENCRYPTION_KEY` (32 bytes), `APP_ORIGIN`, `SCRYPT_LOG_N=17`, email provider credentials (adapter to be written; `EMAIL_TRANSPORT=outbox` is development-only and logs a warning in production).
- **Edge:** HTTPS only, HSTS, WAF/rate limiting in front of auth routes.
- **Worker:** run `npm run worker` as a separate long-running process (or `npm run worker -- --once` from a scheduler every few minutes). It needs the same `DATABASE_URL` as the app. Jobs live in Postgres; no extra infrastructure.
- **Object storage:** R2-compatible bucket for reports/imports (M4).
- **Observability:** OpenTelemetry traces, error monitoring, uptime check on `/api/health`.

## Release checklist
1. `npm run check` and `npm run test:e2e` green.
2. Migrations reviewed; backup taken; `npm run db:migrate` with owner role.
3. Never run `db:seed-demo` in production (the script refuses when `NODE_ENV=production`).
4. Compliance approvals recorded for any `pending_review` feature to be enabled.
5. Smoke test: sign-up → verify → record → dashboard.

## Backup & disaster recovery (to finalise)
RPO ≤ 15 min (WAL/PITR), RTO ≤ 4 h. Quarterly restore drill into an isolated environment; verify RLS and row counts after restore. Encryption key escrow for `APP_ENCRYPTION_KEY` (losing it disables MFA secrets, not financial data).

## This repository
WealthOS lives in `wealthos/` inside `jonathanobise/paruto-apps`. The repo root `.assetsignore` excludes it from the apps.paruto.com static publish. It can be split into its own repository with `git subtree split --prefix=wealthos`.
