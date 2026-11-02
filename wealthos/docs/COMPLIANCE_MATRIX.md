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
| GOAL_PROJECTIONS | hypothetical | portfolio:read | hypothetical, not_advice | pending_review | none | NG | Projection presentation rules |
| STRESS_TESTS | hypothetical | portfolio:read | hypothetical, not_advice | pending_review | none | NG | Risk-warning format for stress illustrations on a user's own portfolio? |
| EDUCATION | education | — | not_advice | not_required | none | NG | — |
| AI_RESEARCH_ASSISTANT | information | ai:use, research:read | ai_limits, not_advice | pending_review | all_access | NG | Lawful basis/transfer for AI vendors; refusal boundaries; liability for errors. Built (docs/AI_SAFETY.md): three-layer advice boundary, separate `ai_data_processing` consent, redaction, per-turn audit; not connected to any provider |
| ALERTS_USER_DEFINED | tooling | portfolio:read | data_freshness | not_required | writes | NG | Alerts must avoid buy/sell calls to action |
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
