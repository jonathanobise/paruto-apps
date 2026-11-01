# AI research assistant — safety design (Milestone 3; not built)

No AI feature is live and no user data is sent to any model provider today.

## Shape
Retrieval-augmented, tool-using assistant. The model never computes balances or returns: it calls typed tools backed by the deterministic engine and returns their structured results with sources.

Tools (each authorised with the caller's tenant context, read-only): `getPortfolioSummary`, `getHoldings`, `getTransactions`, `getInstrumentFacts`, `getHistoricalPriceSeries`, `getFXRates`, `getYieldHistory`, `calculateScenario`, `getSourceProvenance`.

## Guardrails
1. **Advice boundary:** a classifier + system policy route personalised "what should I buy/sell" requests to an educational answer (evaluation factors, objective product facts, risks) — never a security tailored to the user. Feature `PERSONALISED_RECOMMENDATIONS` stays hard-disabled.
2. **Grounding:** every material market claim must cite a source id and as-of date from tool output; claims without provenance are stripped or flagged. Missing/stale data is reported, not invented.
3. **Prompt injection:** retrieved documents and user-entered text are data, delimited and never treated as instructions; tools are allow-listed, read-only, schema-validated, and re-authorised server-side on every call.
4. **Privacy:** lawful basis and explicit disclosure before any personal financial data leaves WealthOS (NDPA 2023; cross-border transfer rules). Default: aggregate/pseudonymised context; vendor DPA and zero-retention settings required.
5. **Logging:** conversations logged with redaction and retention limits; users can delete them; access audited (`auditLogging: all_access`).
6. **Cost controls:** per-plan metering, token budgets, caching, model fallback to a smaller model with the same tool contract.
7. **Evaluation:** a versioned dataset of advice-boundary, injection, hallucination and arithmetic cases must pass before each release; human review pathway for future regulated features.
