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

## Milestone 4 — Commercial beta ✅ (except deployment, which awaits approval)
- **Multi-user onboarding:** household/business spaces, email invitations bound to the invited address, roles (owner/admin/member/viewer) with Postgres-enforced rules, leave/remove; sign-in keeps the invitation link.
- **Entitlements and plans:** configurable plan catalogue (Free ₦0, Wealth Plus ₦4,500/mo, Wealth Pro ₦12,500/mo, Adviser placeholder — hypotheses), limits enforced in services, downgrades never delete data (docs/BILLING.md).
- **Subscription billing (provider-neutral):** trials, plan requests, prorated upgrades, scheduled downgrades and cancellation, renewal invoices, past-due grace and expiry (hourly job), numbered tax-aware immutable invoices and receipts, bank-transfer reconciliation by admins, signed-webhook framework with idempotency and reconciliation of mismatches, revenue analytics. No payment provider connected (terms not confirmed).
- **Admin console:** users, organisations, billing, plans and billing settings, support queue, AI usage (metadata only), jobs (retry dead letters), audit and security logs, feature gates, source freshness, education list. Every view of personal details audited.
- **Reports:** PDF wealth statement and CSV statement/holdings, built from the same services as the screens; PDF on Plus/Pro.
- **Import workflows:** currency conversions and transfers between own accounts (cash and securities) from CSV; transfers recognised across both accounts' statements.
- **Production security review** (docs/SECURITY_REVIEW.md): 11 findings fixed (IP spoofing, invoice and trial tampering, last-owner check, CSP, TOTP replay…).
- **Observability:** structured logs, request ids, server error hook, readiness endpoint.
- **Performance:** single-replay holdings performance (cold 850 → 645 ms on 2,400 events/5 years; cached 4 ms).
- **Deployment readiness:** Dockerfile, CI workflow (inactive until enabled), runbook. **Not deployed.**

Carried forward: payment provider integration (after terms), email provider, AI provider connection and live eval, support/compliance staff roles, independent penetration test, infrastructure choice and deployment.

## Milestone 5 — Expansion (engineering foundations ✅; launches gated)
- **Household planning:** ownership of each account split between members, net worth by person reconciling to the space total.
- **Authorised institution connections (framework):** consented, read-only, expiring connections with encrypted provider credentials; daily syncs become import previews the user reviews; sandbox test double only. **No provider connected.**
- **Staff roles:** support agents and compliance reviewers with Postgres-enforced, narrower access; in-app compliance decisions; compliance approvals locked down by row-level security.
- **African expansion (framework):** jurisdiction catalogue, record-keeping currencies (GHS, KES, ZAR, XOF, EGP), per-jurisdiction gating; **only Nigeria offered**.
- **Mobile:** installable web app with an offline page and no on-device caching of financial data; all screens verified at phone width (fixed a header overflow that zoomed every page out on phones). **Native apps not built** (store accounts, token API).
- **Adviser partnerships and regulated advice:** not built; hard-disabled; operating-model requirements in docs/EXPANSION.md.

Needs owner/counsel/vendor decisions: data-provider choice and CBN open-banking status, per-country legal review, native app plan, adviser operating model and authorisation.
