# Roadmap

## Milestone 0 — Discovery & architecture ✅
Repository/environment inspected; dependency versions verified; module boundaries, schema, ERD, invariants, security and regulatory constraints documented.

## Milestone 1 — Working foundation ✅
Scaffold, design system and app shell (light/dark, responsive), authentication (email+password, verification, reset, TOTP MFA, sessions, lockout, rate limits), multi-tenant model with RLS, preferences and consents, privacy export/erasure, DEMO portfolio with labelled synthetic data, test infrastructure (unit, integration, E2E), local setup.

## Milestone 2 — Core wealth engine ✅
Done: accounts (13 types), manual valuations, liabilities, ownership share, instrument master + private instruments, immutable ledger with 18 event types and reversals, lots (FIFO/average), holdings, market values, FX conversion policy, net worth + history, TWR/XIRR/annualisation, contributions-vs-returns bridge with FX effect, allocation/currency/geography, maturities, data-quality panel, CSV export.
CSV import ✅ (preview, validation, duplicate detection, institution mappings, atomic commit, reversible rollback, idempotency — docs/IMPORTS.md).
Account editing, closing and re-opening ✅. Per-account and per-holding performance (TWR, XIRR, gain, income; local vs base currency; closed positions) ✅. Analytics snapshot cache with exact invalidation and a performance benchmark ✅.
Carried forward: import of transfers/FX conversions; faster cold holdings performance (single replay for all holdings); catalogue-level corporate actions.

## Milestone 3 — Research & planning ✅
- **Research:** admin-verified market-data import (prices/NAVs, published rates, FX) with preview and commit, source registry with licence notes and freshness, verified catalogue facts, explorer, instrument pages (price/NAV history, trailing price returns, rates by methodology, sources), methodology-aware comparisons with derived equivalents, watchlists, saved comparisons.
- **Planning:** goals linked to accounts or net worth with ≥ 2 return scenarios, today's-money targets, required contributions and currency sensitivity; browser-side scenario simulator with fee drag; documented stress scenarios on current holdings; user-defined target mixes.
- **Alerts:** durable Postgres job queue (retries, dead letters, crash recovery) and worker; price/FX level, maturity, stale-data, concentration and goal-milestone alerts; idempotent in-app notifications.
- **AI research assistant:** tool-grounded, non-advisory, consent-gated, redacted and audited (docs/AI_SAFETY.md). Built and tested with scripted providers; **not connected** to a provider and its live eval has not been run.
- **Education:** 7 general articles (T-bill yields, fund yields, TWR vs XIRR, currency risk, inflation, fees, diversification) with engine-verified worked examples, linked from holdings, instrument and comparison pages.
- **Privacy follow-ups:** export now covers goals, watchlists, alerts, notifications and assistant conversations; erasure removes a user's personal rows in shared organisations.

Carried forward: connect an AI provider after counsel and vendor approval, then run the live eval; admin review queue for flagged conversations; email delivery of notifications (needs an email provider); live market-data feeds (licensing); faster cold holdings performance.

## Milestone 4 — Commercial beta
Plans/entitlements (Free ₦0, Plus ₦4,500/mo, Pro ₦12,500/mo — hypotheses, configurable), payment provider (after terms review), admin console, audit viewer, reports (PDF/CSV), import workflows, CSP/HSTS, observability, security review, performance testing, deployment.

## Milestone 5 — Expansion
Authorised institution connections, adviser partnerships (only after authorisation), mobile apps, households, other African markets.
