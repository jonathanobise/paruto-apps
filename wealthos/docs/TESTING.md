# Testing

| Level | Command | What | Count (Nov 2026) |
|---|---|---|---|
| Unit | `npm run test:unit` | Engine (money, dates, FX policy, lots, corporate actions, income, flows, reversals, valuation policies, TWR, XIRR, attribution, risk, allocation, drift, projections, fixed income), compliance gates, and CSV parsing/mapping/duplicates including hostile files | 108 |
| Integration | `npm run test:integration` | Real Postgres (`wealthos_test`, recreated from migrations each run): sign-up/in, lockout, reset, MFA; adversarial tenant isolation; ledger posting, replay validation, idempotency, reversals, entry reconciliation, multi-currency, manual assets, missing-FX policy; export and erasure; CSV import preview/commit/rollback, ledger-level row errors, duplicates, stale-preview and atomicity checks, mappings, cross-tenant imports, export/erasure with imports | 47 |
| E2E | `npm run test:e2e` | Browser journey: sign-up → verify → account → deposit → private instrument → purchase → rejected oversell → dividend → dashboard figures → reversal → CSV export → sign-out; unauthenticated access; CSV import with mapping fix, commit, duplicate-file warning and rollback | 3 |

## Financial acceptance
Expected values come from independent sources (spreadsheet documentation, Python `decimal`/`statistics`, hand calculation), recorded in test comments and FINANCIAL_ENGINE.md. A test that disagrees with the engine is investigated, never "updated to match" without explaining which side was wrong (three such cases during development were test errors and are documented inline).

## Not yet covered
Webhook signature tests (billing not built), prompt-injection evals (AI not built), load/performance tests, accessibility audit with axe, visual regression.
