# Testing

| Level | Command | What | Count (Nov 2026) |
|---|---|---|---|
| Unit | `npm run test:unit` | Engine (money, dates, FX policy, lots, corporate actions, income, flows, reversals, valuation policies, TWR, XIRR, attribution, risk, allocation, drift, projections, fixed income), compliance gates, CSV parsing/mapping/duplicates including hostile files, and holding performance (local vs base currency) | 113 |
| Integration | `npm run test:integration` | Real Postgres (`wealthos_test`, recreated from migrations each run): sign-up/in, lockout, reset, MFA; adversarial tenant isolation; ledger posting, replay validation, idempotency, reversals, entry reconciliation, multi-currency, manual assets, missing-FX policy; export and erasure; CSV import preview/commit/rollback, ledger-level row errors, duplicates, stale-preview and atomicity checks, mappings, cross-tenant imports, export/erasure with imports; account editing/closing/re-opening; account and holding performance; analytics cache equivalence, invalidation by every input type, and tenant isolation | 61 |
| E2E | `npm run test:e2e` | Browser journey: sign-up → verify → account → deposit → private instrument → purchase → rejected oversell → dividend → dashboard figures → reversal → CSV export → sign-out; unauthenticated access; CSV import with mapping fix, commit, duplicate-file warning and rollback; account edit, performance card and close | 4 |
| E2E (research) | `npm run test:e2e` | Admin enables 2FA, registers a source, verifies an instrument, imports NAVs and rates; user searches, watches, compares (derived true yield), saves a comparison; non-admin can't see the console | +1 |
| E2E (planning, alerts) | `npm run test:e2e` | Goal with scenarios (input kept after a validation error), simulator, stress tests, target mix; goal-milestone alert → check now → notifications once → mark read | +2 |
| Performance | `npm run test:perf` | ~2,400-transaction, 5-year ledger imported via CSV; times import, dashboard (cold/cached/uncached) and holdings performance; writes `test-results/perf.json`; budgets: dashboard < 5 s cold, < 250 ms cached | 1 |

## Financial acceptance
Expected values come from independent sources (spreadsheet documentation, Python `decimal`/`statistics`, hand calculation), recorded in test comments and FINANCIAL_ENGINE.md. A test that disagrees with the engine is investigated, never "updated to match" without explaining which side was wrong (three such cases during development were test errors and are documented inline).

## Not yet covered
Webhook signature tests (billing not built), prompt-injection evals (AI not built), load/performance tests, accessibility audit with axe, visual regression.
