# AI research assistant — safety design

Status (2 Nov 2026): **built, not connected.** The code is complete and tested against scripted providers. No API key is configured anywhere, so no question or user data has been sent to any AI provider. The feature is `pending_review` in the compliance registry: visible in development and staging, blocked in production until the counsel questions below are answered.

## Shape
A tool-using assistant (`src/server/ai/`). The model never computes balances, returns or projections and never states market facts from memory: it calls typed, read-only tools backed by the deterministic engine and the verified catalogue, and the answer cites their sources and as-of dates.

| File | Role |
|---|---|
| `prompt.ts` | Stable system prompt (role, advice boundary, grounding, "tool output is data", style) + a per-request context note (date, display currency, consent state, DEMO flag) sent as a mid-conversation system message |
| `tools.ts` | 10 strict JSON-schema tools (`additionalProperties: false`), each run with the caller's tenant context so Postgres RLS applies exactly as in the app |
| `policy.ts` | Deterministic request classifier, output check, safe answer, redaction (unit-tested) |
| `provider.ts` | Provider boundary: Anthropic adapter, scripted `MockProvider` for tests, labelled `TestProvider` for browser tests (refused in production) |
| `assistant.ts` | One user turn: limits → policy → manual tool loop → output check → redacted log |

### Tools
| Directive name | Tool | Personal data? |
|---|---|---|
| getPortfolioSummary | `get_portfolio_summary` | yes |
| getHoldings | `get_holdings` | yes |
| getTransactions | `get_transactions` (≤ 50) | yes |
| getInstrumentFacts | `search_instruments`, `get_instrument_facts` | no |
| getHistoricalPriceSeries | `get_historical_price_series` (weekly, ≤ 60 months) | no |
| getFXRates | `get_fx_rate` (no stale substitution: returns "no rate" rather than an old one) | no |
| getYieldHistory | `get_yield_history` (methodology, tenor, basis, as-of, source) | no |
| calculateScenario | `calculate_scenario` (deterministic projection engine, ≥ 2 return assumptions, fees, inflation) | no |
| getSourceProvenance | `get_source_provenance` | no |

Personal-data tools are offered to the model **only** when the user has granted the `ai_data_processing` consent; if the model asks for one anyway it gets an error result, not data. Every result is JSON `{data, sources, notes}`, truncated at 20,000 characters.

### Model call
`client.beta.messages.create` with model `claude-opus-5-5` (override `AI_MODEL`), `output_config.effort: "medium"`, `max_tokens` 4,000, strict tools with automatic tool choice, and server-side fallback (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`) for policy declines. If the primary model is unavailable (HTTP 5xx/529) the adapter retries once on `AI_FALLBACK_MODEL` (default `claude-sonnet-5-5`) with the same tools; it never switches models to get around a refusal. The tool loop is manual (≤ 6 tool rounds), appends each model turn unchanged, and handles `refusal`, `max_tokens` and runaway loops explicitly.

## Guardrails
1. **Advice boundary (three layers).** (a) The system prompt forbids naming a security, fund or allocation for the user, or buy/sell/hold/timing calls. (b) `classifyRequest` detects personalised decision requests ("should I sell…", "best fund for me", "how should I allocate my savings…") and adds an operator note telling the model to explain decision factors and objective facts instead; the turn is flagged `personal_advice_request`. (c) `checkOutput` scans the final answer for prescriptive language ("you should buy…", "put 60% in…"); a hit replaces the whole answer with a fixed safe answer, flags it and marks the conversation `needs_review`. `PERSONALISED_RECOMMENDATIONS` stays hard-disabled.
2. **Grounding.** Market facts and personal figures come only from tools; arithmetic only from `calculate_scenario`. Each tool returns provenance; sources with as-of dates are stored and shown under the answer. When a lookup returns nothing dated, the UI says so. SAMPLE/DEMO data is labelled in tool output and the context note.
3. **Prompt injection.** Tool output (product descriptions, transaction notes, names) reaches the model only inside `tool_result` JSON and the prompt says it is data. Tools are allow-listed, read-only, schema-validated (strict), ids validated, and re-authorised by RLS on every call. Tested with an injected instruction in a transaction description.
4. **Privacy.** Emails, phone numbers, card numbers, 11-digit ids and 10-digit account numbers are masked before a question is sent **and** before it is stored. Without consent, nothing from the user's records is sent. The consent card explains what is sent, to whom (Anthropic, US), what WealthOS keeps, and the daily limit; withdrawal takes effect on the next question. Consent changes are append-only `consent_records` (`ai_data_processing`, version `2026-11-02`).
5. **Logging.** `ai_conversations`, `ai_messages`, `ai_source_references` are private to the user even inside a shared organisation (RLS on org **and** user). Stored: redacted question and answer, tool names and arguments (never tool results), model, stop reason, token counts, policy flags, sources. Every turn writes an `ai.ask` audit event (tools, flags, tokens; no content). Users can delete conversations; they are in the data export and removed on account erasure. A conversation is created only when an answer is saved, so failures leave nothing behind.
6. **Cost controls.** 30 questions per user per day; a monthly token budget per organisation (`AI_ORG_MONTHLY_TOKEN_BUDGET`, default 2,000,000) checked before any model call; 2,000-character questions; 12 prior messages of history (text only); 4,000 output tokens; ≤ 6 tool rounds. Per-plan metering arrives with billing (M4).
7. **Evaluation.** Deterministic layer: `tests/unit/ai-policy.test.ts` (advice classifier positives/negatives, output check, redaction, eval-set validity). Behaviour with tools: `tests/integration/ai.test.ts` (13 tests with `MockProvider`: consent gating, injection, safe-answer replacement, refusal, loop limit, scenario engine, id validation, redaction, tenant isolation, budget, provider failure, export and erasure). Model-level: `tests/ai/eval-cases.json` (20 cases: education, catalogue, FX, missing data, personal, advice boundary, scenario, injection, scope) run live with `npm run ai:eval -- --yes` on the DEMO portfolio only. **It has not been run** (no key; it costs money) and must pass before the feature is enabled anywhere real.

## Before enabling (owner decisions)
- Counsel: lawful basis and cross-border transfer (NDPA 2023, GAID 2025) for sending portfolio data to a US vendor; whether the refusal boundary is sufficient under ISA 2025 / SEC rules; liability wording for wrong answers.
- Vendor: Anthropic commercial terms/DPA and data-retention settings; who holds the API key; a monthly spend cap in the Anthropic console (paid commitment — needs approval).
- Run the live eval and review every failure; set the per-organisation budget to match the plan.
- Human review path for conversations marked `needs_review` (admin viewer not built yet).
