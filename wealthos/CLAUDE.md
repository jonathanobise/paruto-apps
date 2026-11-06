# WealthOS — working notes for Claude

Public name: **Paruto Wealth** (working name; ADR-028). Never hard-code the product name in UI, emails, PDFs or prompts: use `BRAND` from `src/lib/brand.ts`. "WealthOS" is only the internal codename (folder, package, database, cookies).

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
- Plan limits: new creatable things (accounts, goals, alerts, watchlists, members, imports, assistant questions, PDF reports) must call `enforceLimit`/`enforceFeature` (src/server/billing/entitlements.ts) inside the insert's transaction. Downgrades never delete data.
- Money owed is issued only by the billing system (`withBillingSystem`) after the app checks the caller's role; never let customers write invoice amounts, and never apply a payment that doesn't match the invoice exactly. No payment provider may be connected until its terms are confirmed (docs/BILLING.md).
- Staff features run in `asStaff(roles)` / `asAdmin` (Postgres re-checks role + 2FA), audit every view of a person's or organisation's details, and never read financial records or assistant conversation content.
- Bank-connection data only ever enters the ledger through a user-reviewed import preview. Only Nigeria is offered: never add a jurisdiction to a feature without a recorded compliance decision. Never cache financial data in the service worker.
- Don't trust X-Forwarded-For directly: use `requestMeta()` (src/lib/client-ip.ts).
- Analytics results are cached (`src/server/analytics/cache.ts`). When you change any calculation that affects dashboard/account/holding results, bump `ANALYTICS_VERSION` so stale cached results are not served. New inputs to the analytics must be added to `inputsFingerprint`.

## Research platform (Milestone 6, in progress)
Real data only: no fictional instruments in research (SAMPLE data stays in the demo portfolio). Sources, terms and evidence: docs/DATA_SOURCES.md; every stored value keeps its source, and every source's attribution must show where its data appears.
- Rebuild the data (local DB is empty in a new session): `npm run db:migrate && npm run ingest -- all` (CBN FX/inflation/money market/auctions + derived T-bill index, Fed funds, Bank Rate, ONS CPI; ~10 s), then `npm run ingest -- eodhd --budget=N [--fundamentals] [--symbols=AAPL.US,...]` (needs the `EODHD_API_KEY` environment secret; resumable within a daily call budget; universe in src/server/ingest/universe.ts; NGX stocks discovered from EODHD's XNSA list).
- EODHD data is licensed for the owner's own use: never show it on the public demo or to anyone else without a display licence.
- Engine: src/engine/market-performance.ts (total return, same-date FX, month-end sampling, real returns from index or chained y/y). Service + cache: src/server/research/performance.ts (bump PERFORMANCE_ENGINE_VERSION when calculations change). Validated: AAPL total return 2020 +82.3%, 2021 +34.6%, 2022 −26.4%, 2023 +49.0%; VTI 2022 −19.5%.
- Data quality: official series contain keying errors; isolated one-day spikes are excluded and reported (findIsolatedSpikes), never replaced.
- Still to build: research pages (markets scoreboard, macro, fixed income, instrument performance and fundamentals, screener, cross-market compare, portfolio backtester), assistant tools, compliance registry entries, US CPI (BLS key).

## Design
Paruto design standard (docs/DECISIONS.md ADR-027): dark by default for everyone, light opt-in via the header toggle — never reintroduce prefers-color-scheme switching. Tokens live in `src/app/globals.css`; change look-and-feel there. Liquid Glass (`.glass`) only on floating controls, never content panels. Page titles use `PageHeader` (last word in Instrument Serif italic). Buttons are capsules with `spring` motion; inner radii `var(--radius-inner)` inside `var(--radius-card)` panels. Status colours carry text too (contrast ≥ 4.5:1) — always with a label or sign, never colour alone. Run the dataviz palette validator before changing chart colours. The user didn't like a light, apple.com-marketing look.

## Commands
`npm run check` (typecheck, lint, unit, integration) · `npm run test:e2e` · `npm run test:perf` (large-ledger timings) · `npm run db:generate` then hand-review SQL · `npm run db:migrate` · `npm run db:seed-demo -- --with-user` · `npm run worker` (alerts + billing lifecycle) · `scripts/grant-admin.ts`, `scripts/record-compliance-decision.ts` (operator scripts, owner role). Ops: docs/RUNBOOK.md.

Integration tests recreate the `wealthos_test` schema each run. Schema changes: edit `src/server/db/schema`, run `npm run db:generate`, add RLS/grants for new tenant tables in a custom migration (`npx drizzle-kit generate --custom`), and extend `tests/integration/tenancy.test.ts`.

## Deployment
Public demo only: https://wealth-demo.paruto.com (docs/DEMO.md; deploy with `deploy/demo/deploy.sh`, from committed code). Demo mode (`DEMO_MODE=1`) must keep refusing anything that could lock visitors out, contact people or create money owed: new features with those effects call `assertNotDemo`. Production: not deployed. Ask before any production deployment, paid service, or change with regulatory implications. This folder is excluded from the apps.paruto.com publish via the repo root `.assetsignore`.
