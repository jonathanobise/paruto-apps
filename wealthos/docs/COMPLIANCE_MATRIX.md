# Regulatory review matrix (for Nigerian counsel)

> Prepared by engineering to structure legal review. **It is not legal advice and has not been reviewed by counsel.** A disclaimer alone does not make a regulated activity lawful; the existence of similar products does not imply authorisation.

Frameworks to confirm (versions and applicability to be verified by counsel): Investments and Securities Act 2025 and SEC Nigeria rules (https://sec.gov.ng) — including whether any WealthOS feature constitutes investment advice, research, or adviser activity requiring registration and capital; Nigeria Data Protection Act 2023 and NDPC directives (https://ndpc.gov.ng) — lawful basis, DPIA, registration as a data controller of major importance, cross-border transfers; CBN rules relevant to payments and any future account-aggregation/open-banking; FCCPC consumer protection; tax rules referenced in content.

Source of truth in code: `src/server/compliance/features.ts`. A feature is available only if not hard-disabled, its latest decision for the jurisdiction allows it (`regulatory_feature_approvals`, append-only), and its operational flag is on. **`pending_review` features are unavailable in production** until approved. `APP_ENV` (development | test | staging | production, independent of the build mode) decides this: staging runs a production build but may show pending features for review.

| Feature key | Classification | Permissions | Disclosures | Default status | Audit | Jurisdictions | Questions for counsel |
|---|---|---|---|---|---|---|---|
| PORTFOLIO_TRACKING | tooling | portfolio:read/write | non_custodial, data_freshness | not_required | writes | NG | Confirm record-keeping of user-entered data is unregulated |
| PERFORMANCE_ANALYTICS | tooling | portfolio:read | past_performance, data_freshness | not_required | none | NG | Presentation rules for performance figures? |
| NET_WORTH | tooling | portfolio:read | estimates, data_freshness | not_required | none | NG | — |
| MODEL_PORTFOLIO_USER_DEFINED | hypothetical | portfolio:read/write | hypothetical, not_advice | pending_review | writes | NG | Is showing drift from a target the user set (no trade instructions) advice? |
| INSTRUMENT_EXPLORER | information | research:read | not_advice, data_freshness, past_performance | pending_review | none | NG | Registration needed for factual fund/product comparisons? Advertising rules for yields? Data licences |
| MARKET_RESEARCH | information | research:read | not_advice, data_freshness, past_performance | pending_review | none | NG | Includes the screener (user-chosen filters and sorts; nothing pre-ranked as "best") and cross-market comparison. Is non-personalised historical performance of asset classes/listed securities "research" needing SEC registration? Past-performance and real-return presentation rules; display licences for third-party market data (licensed data is never shown on the public demo) |
| PORTFOLIO_BACKTEST | hypothetical | research:read | hypothetical, past_performance, not_advice | pending_review | none | NG | Rules for presenting back-tested (hypothetical) performance to retail users? The user picks every instrument and weight; no weights are suggested and nothing is stored. No costs or taxes are modelled (stated on the page) |
| GOAL_PROJECTIONS | hypothetical | portfolio:read | hypothetical, not_advice | pending_review | none | NG | Projection presentation rules |
| STRESS_TESTS | hypothetical | portfolio:read | hypothetical, not_advice | pending_review | none | NG | Risk-warning format for stress illustrations on a user's own portfolio? |
| EDUCATION | education | — | not_advice | not_required | none | NG | — (content rules: general only, no current rates, illustrative examples verified by the engine, output policy applied in tests) |
| AI_RESEARCH_ASSISTANT | information | ai:use, research:read | ai_limits, not_advice | pending_review | all_access | NG | Lawful basis/transfer for AI vendors; refusal boundaries; liability for errors. Built (docs/AI_SAFETY.md): three-layer advice boundary, separate `ai_data_processing` consent, redaction, per-turn audit. Research tools (market snapshot, macro, fixed income, long-run returns, screener, compare, backtest) are offered only where MARKET_RESEARCH / PORTFOLIO_BACKTEST are available and follow their rules (no default ranking, no suggested weights, hypothetical labelling). Connected only where an `ANTHROPIC_API_KEY` is configured (none by default) |
| ALERTS_USER_DEFINED | tooling | portfolio:read | data_freshness | not_required | writes | NG | Alerts must avoid buy/sell calls to action |
| HOUSEHOLD_PLANNING | tooling | portfolio:read | estimates | not_required | writes | NG | — (a planning view of who owns what; not a record of legal title) |
| INSTITUTION_CONNECTIONS | tooling | portfolio:read/write | data_freshness, non_custodial | pending_review | all_access | NG | CBN open-banking framework: does WealthOS need to register as a participant to receive data via a licensed provider? Consent wording/duration/renewal; NDPA lawful basis; provider due diligence and DPA. No provider connected |
| SHARED_SPACES | tooling | portfolio:read | non_custodial | not_required | writes | NG | Consent when one member records another person's finances in a shared space? |
| REPORTS | tooling | portfolio:read | past_performance, data_freshness, not_advice | not_required | all_access | NG | Presentation rules for performance in downloadable statements |
| SUBSCRIPTION_BILLING | commercial | portfolio:read | — | pending_review | writes | NG | Terms of sale, refunds and cancellation (FCCPA 2018); VAT registration and inclusive/exclusive pricing; invoice contents; invoice retention after erasure (tax law vs NDPA). See docs/BILLING.md |
| PERSONALISED_RECOMMENDATIONS | regulated_advice | adviser:clients | — | rejected (hard-disabled) | all_access | — | Licensing path if ever pursued |
| AUTO_REBALANCING | regulated_advice | adviser:clients | — | rejected (hard-disabled) | all_access | — | — |
| DISCRETIONARY_MANAGEMENT | regulated_advice | adviser:clients | — | rejected (hard-disabled) | all_access | — | — |
| ORDER_EXECUTION | regulated_execution | — | — | rejected (hard-disabled) | all_access | — | Broker-dealer partnership model |
| CUSTODY_OF_FUNDS | regulated_execution | — | — | rejected (hard-disabled) | all_access | — | — |
| AUTOMATED_TRADING | regulated_execution | — | — | rejected (hard-disabled) | all_access | — | — |
| ADVISER_WORKSPACE | regulated_advice | adviser:clients | — | rejected (hard-disabled) | all_access | — | Adviser registration, agreements, supervision |
| Subscriptions & billing (M4) | commercial | — | pricing, cancellation | not yet registered | writes | NG | Consumer-protection and auto-renewal rules; VAT |

## Before public launch
Counsel review of this matrix, Terms and Privacy Notice (currently marked DRAFT in the app); DPIA; NDPC registration if applicable; decide data residency; record each approval in `regulatory_feature_approvals` with reviewer and reference.

## Jurisdictions
Only Nigeria is offered (`src/lib/jurisdictions.ts`). Ghana, Kenya and South Africa are catalogued as planned with their regulators and data-protection laws for counsel to verify; no feature lists them, so nothing is available there in any environment even if a decision were recorded (tested). Launch steps per country: docs/EXPANSION.md.

## Recording decisions
Compliance reviewers (platform role `compliance`, 2FA) record decisions in Admin → Feature gates, under their own name with a reference; operators can also use `scripts/record-compliance-decision.ts`. Decisions are append-only; only compliance reviewers and administrators can write them (row-level security). Hard-disabled features can't be approved either way.
