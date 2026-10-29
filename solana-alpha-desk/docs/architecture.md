# Architecture

Solana Alpha Desk is a private, single-owner, **paper-trading only** research desk for new Solana tokens.
This document is the architecture decision record (ADR) for release 1.0 and the map of the code.

## Environment found at the start (29 Oct 2026)

| Item | Finding |
| --- | --- |
| Repository | `jonathanobise/paruto-apps` (the apps.paruto.com showcase). Only this repo is in scope for the session, so the desk lives in `solana-alpha-desk/`, listed in the showcase's `.assetsignore` so it is never published on apps.paruto.com. It can move to its own repo unchanged. |
| Runtime | Node 22.22, pnpm 10.28, Chromium + Playwright preinstalled, `node:sqlite` (SQLite 3.50) available. |
| Network | DexScreener, Solana public RPC, Jupiter (`lite-api.jup.ag`, `api.jup.ag`) and RugCheck answer from the container. GeckoTerminal answers but its keyless rate limit is shared and often returns 429. |
| Cloudflare | An API proxy for `api.cloudflare.com` is attached. Nothing was deployed: the repository's own rules say deploy only when the owner asks. |
| Credentials | None for Helius or any other paid indexer. Those integrations are `BLOCKED_BY_CREDENTIALS`. |

## Decisions

**ADR-1 · Domain logic in pure packages, I/O at the edges.** Each agent (Scout, Filter, Analyst, Risk,
Executor, Logger) is a deterministic module that takes typed observations and returns a typed decision with
evidence. Providers, database and clock are injected ports. This makes every agent testable on its own and
lets the same code run inside Cloudflare Workers, the Node monitor, tests and historical replay.

**ADR-2 · One SQL schema, three drivers.** D1 is SQLite, so one set of migrations
(`infrastructure/migrations`) serves:
- the D1 binding (Workers; `batch()` is documented as a transaction);
- `node:sqlite` (local development, tests, replay; explicit `BEGIN`/`COMMIT`);
- a **signed internal SQL bridge** (production monitor → API Worker → D1 binding). The D1 REST API
  accepts a `batch` body but its atomicity is not documented, and the ledger needs atomic multi-statement
  commits, so the monitor never writes D1 over REST. The bridge accepts HMAC-SHA256 signed, timestamped,
  nonce-protected batches and is not reachable with a browser session.

**ADR-3 · Optimistic portfolio locking that works without interactive transactions.** D1 cannot hold a lock
across a read and a write. Every execution-plane commit (fill, close, stop change, breaker) inserts the next
row of `portfolio_versions (portfolio_id, version)` inside the same atomic batch. Two writers that read the
same version both try to insert `version + 1`; the primary key rejects the second, its whole batch rolls
back, and it re-reads and retries. No double fills, no lost updates.

**ADR-4 · Money is integers.** Cash is stored as micro-USD (USDC base units, 6 dp) and token quantities as
base units, both as decimal-integer `TEXT` (SQLite `INTEGER` would overflow JavaScript numbers for some
tokens). Arithmetic on authoritative balances uses `bigint`; prices and ratios use `decimal.js`
(arbitrary precision decimal), never binary floating point.

**ADR-5 · Double-entry ledger separate from the event log.** `ledger_journals` / `ledger_entries` hold
balanced entries per unit (USD and each mint). Equity is derived, and a reconciliation job proves
ledger balances equal position records. The audit log (`audit_events`, `handoff_events`) is append-only,
checksummed and guarded by `RAISE(ABORT)` triggers against `UPDATE`/`DELETE`.

**ADR-6 · Fail closed with lower bounds.** Where free data can only give a lower bound (raw top-holder
concentration without clustering, deployer holdings without the linked-wallet graph), the rule can
**FAIL** on the bound but can only **PASS** with full verification; otherwise it is **UNVERIFIED**, which
blocks trading. With the keyless sources available today, the Filter and Analyst therefore return
`UNVERIFIED` for most candidates until a holder/transaction indexer (Helius adapter) is configured. That is
the intended behaviour, not a defect.

**ADR-7 · Pool adapters, not a universal LP check.** Supported in 1.0: PumpSwap AMM, Raydium CPMM and
Raydium AMM v4 (layouts verified against live mainnet accounts on 29 Oct 2026). For each, the LP mint
outstanding supply is compared with the pool's own LP accounting to measure burned LP, and the remaining LP
holders are classified. Concentrated-liquidity pools (Raydium CLMM, Orca Whirlpool, Meteora DLMM/DAMM),
bonding curves (pump.fun, Meteora DBC) and unknown programs are rejected by F017 until an adapter exists.

**ADR-8 · Executable prices only.** Stops, marks and fills use Jupiter quotes for the actual position size
(`executable reference price` = USDC out ÷ tokens in), not the last-traded price. A quote is never treated as
a fill: the simulator applies latency, a re-quote, slippage bounds, priority + base fees and failure modes.
Partial fills are not modelled because Jupiter swaps are atomic (all or nothing); a failed swap is.

**ADR-9 · Topology.**

```
             ┌────────────── Cloudflare ──────────────┐
 browser ──▶ │ web (static Next.js export, Workers    │
             │      assets) ── /api ──▶ api Worker ───┼──▶ D1 (operational)  R2 (evidence, exports)
             │ discovery-scheduler (cron) ─▶ Queue ───┼─▶ candidate-processor (Filter/Analyst)
             │                         └─▶ DLQ ───────┼─▶ event-consumer (dead letters → alerts)
             └────────────────────▲───────────────────┘
                                  │ HMAC-signed SQL bridge + evidence upload
                    monitor (Node container / VPS, supervised)
                    Risk · Executor · stop loop 1–2 s · breakers · reports · heartbeats
```

In local development and on a single VPS the monitor can run **all** agents in one supervised process
against `node:sqlite` (`pnpm monitor`); that is also how overnight paper sessions are run before the
Cloudflare deployment is approved.

**ADR-10 · `packages/ui` folded into `apps/web`.** The web app is the only UI consumer; a separate package
would add build plumbing with no reuse. **`packages/orchestrator`** is added: it owns the state machine,
handoffs, idempotency and the pipeline that wires agents to providers and storage.

**ADR-11 · AI is optional and never decides.** `packages/ai` exposes a provider-independent interface used
only to draft narrative report summaries from already-computed numbers. Token metadata is never passed
to a model as instructions, and no model output can change a decision, size or stop.

**ADR-12 · No live trading path.** There is no signer, no keypair handling and no `sendTransaction` in the
codebase; ESLint forbids those calls, and a test scans the source tree for them. `RuntimeMode` has no live
value.

## Code map

| Path | Responsibility |
| --- | --- |
| `packages/shared` | ids, hashing, decimal/bigint money, candidate state machine, handoff contract (Zod), clock |
| `packages/config` | versioned strategy configuration (all thresholds), runtime modes |
| `packages/db` | SQL drivers (node:sqlite, D1 binding, signed bridge), migrations runner, repositories |
| `packages/providers` | HTTP with retry/backoff/rate limits/circuit breaking + provenance; DexScreener, GeckoTerminal, Solana RPC, Jupiter, RugCheck, Helius |
| `packages/discovery` | **Scout** agent |
| `packages/security` | **Filter** agent: rules F001–F018, pool adapters, holder classification, developer + bundle analysis |
| `packages/scoring` | **Analyst** agent: six versioned factors, ranking |
| `packages/risk` | **Risk** agent: sizing, single-use authorizations, stops, circuit breakers |
| `packages/execution` | **Executor** agent: paper fill simulator, position lifecycle |
| `packages/ledger` | **Logger** agent: audit events, double-entry ledger, reconciliation |
| `packages/analytics` | trade metrics, segments, reports |
| `packages/ai` | optional AI adapter |
| `packages/orchestrator` | pipeline, handoffs, idempotency, recovery |
| `apps/api` | Cloudflare Worker: auth, REST `/api/v1`, signed internal bridge |
| `apps/monitor` | Node service: continuous loops, health, reports |
| `apps/web` | dashboard |
| `workers/*` | Cloudflare cron + queue entry points |
