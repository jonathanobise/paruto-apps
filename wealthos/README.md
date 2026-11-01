# WealthOS

Non-custodial financial intelligence and wealth-management SaaS — Nigeria first. Track every account, holding and liability; measure performance correctly; see currency exposure and data freshness; plan with honest scenarios.

> **Status: Milestones 0–1 complete, Milestone 2 (core wealth engine) largely complete.** Not deployed. Not legally reviewed. See [docs/ROADMAP.md](docs/ROADMAP.md).

WealthOS Version 1 never holds money, never places trades and never gives personalised investment advice. Regulated features are hard-disabled in code ([docs/COMPLIANCE_MATRIX.md](docs/COMPLIANCE_MATRIX.md)).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript 6 (strict) · Tailwind CSS 4 with shadcn-style components (Radix) · PostgreSQL 16 with row-level security · Drizzle ORM + SQL migrations · Zod 4 · decimal.js · Recharts 3 · Vitest 5 · Playwright. Rationale in [docs/DECISIONS.md](docs/DECISIONS.md).

## Local development

Requirements: Node ≥ 22.12, PostgreSQL ≥ 16 (superuser access once, to create roles).

```bash
psql -U postgres -f scripts/sql/bootstrap-roles.sql
```

```bash
psql -U postgres -c "CREATE DATABASE wealthos_dev OWNER wealthos_owner" -c "CREATE DATABASE wealthos_test OWNER wealthos_owner"
```

```bash
cp .env.example .env.local   # then set APP_ENCRYPTION_KEY (command in the file)
```

```bash
npm install && npm run db:migrate && npm run db:seed-demo -- --with-user
```

```bash
npm run dev   # http://localhost:3100 — sign in as demo@wealthos.test / sample-portfolio-2026
```

Emails (verification, password reset) are not delivered in development; open http://localhost:3100/dev/outbox.

## Quality checks

```bash
npm run check        # typecheck + lint + unit + integration tests
```

```bash
npm run test:e2e     # builds, starts the app and runs the browser journeys (uses .env.local's database)
```

See [docs/TESTING.md](docs/TESTING.md).

## Layout

```
src/engine/        Pure, deterministic financial engine (no I/O). Decimal money, FX, lots, returns…
src/server/        Domain modules: identity, accounts, ledger, market-data, analytics, compliance, privacy, demo
src/server/db/     Drizzle schema; tenant context (withTenant) that sets Postgres RLS variables
src/app/           Next.js routes: (auth) sign-in/up, (app) signed-in screens, api/ exports + health
src/components/    UI primitives (ui/) and app components (app/)
drizzle/           SQL migrations (0001 = RLS policies, append-only triggers, grants)
tests/             unit/ (engine, gates), integration/ (Postgres, adversarial tenancy), e2e/ (Playwright)
docs/              Product, architecture, database, engine, data, AI safety, compliance, security, deployment…
```
