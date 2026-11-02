# WealthOS — working notes for Claude

Read `docs/ARCHITECTURE.md` and `docs/FINANCIAL_ENGINE.md` before changing domain code.

## Non-negotiables
- Money, quantities, prices and FX are `Decimal` (src/engine/decimal.ts) or decimal strings. Never JS numbers for balances. Numbers are allowed only for presentation and for rate solving (XIRR).
- Never substitute another date's FX rate or price. Missing data → flagged (`ValuationIssue`), excluded or valued at cost per policy.
- The ledger is append-only (DB triggers). Corrections are reversals. Never add UPDATE/DELETE paths to `ledger_events`, `ledger_entries`, `account_valuations`, audit/security/consent logs.
- All tenant data access goes through `withTenant(ctx, fn)` (sets RLS context). Never trust client-supplied org/user ids; `requireApp()` / `requireAppForAction()` resolve them from the session and memberships.
- Every server action and route handler authorises itself (layouts are not a security boundary).
- Regulated features (advice, rebalancing instructions, execution, custody) are hard-disabled in `src/server/compliance/features.ts`. Do not enable or route around them. New user-facing features must be added to that registry and to docs/COMPLIANCE_MATRIX.md.
- Synthetic data is always labelled SAMPLE/DEMO (`verification_state = 'synthetic'`, demo organisations). Never seed unlabelled realistic-looking market data.
- Server modules import `server-only`; scripts run with `tsx --conditions=react-server`.
- Analytics results are cached (`src/server/analytics/cache.ts`). When you change any calculation that affects dashboard/account/holding results, bump `ANALYTICS_VERSION` so stale cached results are not served. New inputs to the analytics must be added to `inputsFingerprint`.

## Commands
`npm run check` (typecheck, lint, unit, integration) · `npm run test:e2e` · `npm run test:perf` (large-ledger timings) · `npm run db:generate` then hand-review SQL · `npm run db:migrate` · `npm run db:seed-demo -- --with-user`.

Integration tests recreate the `wealthos_test` schema each run. Schema changes: edit `src/server/db/schema`, run `npm run db:generate`, add RLS/grants for new tenant tables in a custom migration (`npx drizzle-kit generate --custom`), and extend `tests/integration/tenancy.test.ts`.

## Deployment
Not deployed. Ask before any production deployment, paid service, or change with regulatory implications. This folder is excluded from the apps.paruto.com publish via the repo root `.assetsignore`.
