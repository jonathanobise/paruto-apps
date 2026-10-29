# Agent contracts

## Candidate state machine

```
DISCOVERED → FILTER_PENDING → FILTER_APPROVED → ANALYST_PENDING → ANALYST_APPROVED → RISK_PENDING
  → RISK_AUTHORIZED → PAPER_ORDER_PENDING → PAPER_FILLED → POSITION_OPEN → EXIT_PENDING → POSITION_CLOSED
                                                                              ↘ EXIT_FAILED ↺ EXIT_PENDING
```

Branches: `DISCOVERY_REJECTED`, `FILTER_REJECTED | FILTER_UNVERIFIED | FILTER_ERROR`,
`ANALYST_REJECTED | ANALYST_UNVERIFIED`, `RISK_REJECTED | RISK_PAUSED`, `PAPER_REJECTED`, `EXPIRED`.
All of these are terminal; a token is re-evaluated only as a **new run** (new `candidate_id`), at most one
active run per token (unique index), and not before `discovery.reevaluateAfterMinutes` (6 h after
`PAIR_TOO_OLD`).

The full edge list, and which agent may make each move, is `TRANSITIONS` in
`packages/shared/src/states.ts`. Highlights:

| Edge                                                                                  | Allowed agent(s)                                 |
| ------------------------------------------------------------------------------------- | ------------------------------------------------ |
| ∅ → DISCOVERED / DISCOVERY_REJECTED, DISCOVERED → FILTER_PENDING                      | SCOUT                                            |
| FILTER_PENDING → FILTER_* , FILTER_APPROVED → ANALYST_PENDING                         | FILTER                                           |
| ANALYST_PENDING → ANALYST_*, ANALYST_APPROVED → RISK_PENDING                          | ANALYST (OWNER in PAPER_MANUAL)                  |
| RISK_PENDING → RISK_*                                                                 | RISK                                             |
| RISK_AUTHORIZED → PAPER_ORDER_PENDING → PAPER_FILLED / PAPER_REJECTED → POSITION_OPEN | EXECUTOR                                         |
| POSITION_OPEN → EXIT_PENDING, EXIT_FAILED → EXIT_PENDING                              | RISK, OWNER                                      |
| EXIT_PENDING → POSITION_CLOSED / EXIT_FAILED                                          | EXECUTOR                                         |
| * → EXPIRED                                                                           | SYSTEM (and RISK for invalidated authorizations) |

No frontend code authorizes or executes anything: the dashboard calls owner endpoints that only request
transitions the state machine allows (an owner can approve into Risk, never past it).

## Handoff contract

Every transition writes one `handoff_events` row whose `body` is validated by
`HandoffEventSchema` (Zod, `packages/shared/src/handoff.ts`):

`event_id, schema_version, correlation_id, candidate_id, token_mint, source_agent, destination_agent,
event_type, previous_state, next_state, observed_at, generated_at, expires_at, evidence_ids,
config_version, strategy_version, idempotency_key, payload`.

- The schema refuses an edge the source agent may not make, `generated_at` earlier than `observed_at`,
  and `expires_at` not after `generated_at`.
- `idempotency_key = sha256(candidate_id, previous_state, next_state, config_version)`: a redelivered
  message produces the same key; the unique index turns it into `DUPLICATE` with the committed outcome.
- Progression is monotonic: each commit is guarded by `(state, state_version)`; a stale writer gets
  `STALE` and changes nothing.

## Atomic commits

`transition()` writes, in one D1 batch / SQLite transaction: a guard row (aborts the batch when the
candidate is not in the expected state/version), the handoff event, the candidate update, an audit event,
and any stage-specific rows (rule results, scores, authorizations, orders). Execution-plane commits add
the portfolio optimistic lock (`portfolio_versions`, ADR-3). Either everything is written or nothing is.

## Stage I/O

| Stage    | Reads                                                                                                                     | Writes                                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Scout    | feeds, `/tokens/v1/solana`                                                                                                | tokens, token_pools, market_snapshots, candidate_discoveries, evidence                                                        |
| Filter   | mint + pool accounts, LP mint, vaults, largest holders (RPC), pair (DexScreener), sell quotes (Jupiter), RugCheck, Helius | token_security_assessments, security_rule_results (18 rows), holder_snapshots, developer_histories, launch_bundle_assessments |
| Analyst  | market_snapshots series, Helius swaps + holder counts, assessment summary, smart-wallet registry                          | analyst_scores, score_factors, opportunities, ranking_changes                                                                 |
| Risk     | fresh buy/sell quotes, priority fees, equity, positions, breakers                                                         | proposed_orders, risk_authorizations                                                                                          |
| Executor | authorization, quotes                                                                                                     | paper_orders, fills, positions, stop_events, ledger                                                                           |
| Logger   | everything                                                                                                                | audit_events, reconciliation, report_runs                                                                                     |

## Queues

Durable work lives in `work_items` (at-least-once, leased, exponential backoff, dead-letter after 5
attempts with an alert). Cloudflare Queues only carry wake-up signals, so a lost or duplicated message
cannot lose or duplicate work.
