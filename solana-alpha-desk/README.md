# Solana Alpha Desk

A private, single-owner research desk that discovers new Solana tokens, verifies them against on-chain
evidence, scores the survivors, and **paper-trades** them under strict risk controls — continuously,
including overnight, with every decision recorded and auditable.

> **Paper trading only.** There is no wallet, no key handling, no transaction signing and no broadcast
> anywhere in this codebase (enforced by ESLint and by a test that scans the source). Fills are
> simulated from executable Jupiter quotes. Nothing here can move real funds.

Current status, test results, integration and credential status: **[BUILD_STATUS.md](BUILD_STATUS.md)**.

## How it works

Six agents hand candidates along a guarded state machine (`docs/agent-contracts.md`):

| Agent        | Does                                                                                                                                                                                                                                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Scout**    | Pulls DexScreener profile/boost/takeover feeds and GeckoTerminal new pools, verifies every mint against DexScreener pair data, keeps pools 30 min – 72 h old with $0.3 M – $20 M market cap (never substituting FDV).                                                                                         |
| **Filter**   | 18 hard rules (F001–F018) on on-chain and provider evidence: authorities, Token-2022 extensions, LP burn/lock per pool adapter, on-chain liquidity, volume, holder concentration, developer history, launch bundling, sell route, provider consistency, freshness. Anything not proven PASS blocks the token. |
| **Analyst**  | Six versioned factors (momentum, unique buyers, buy/sell value, holder growth, liquidity/market cap, smart wallets) → 0–100; ≥ 70 with verified data to pass. Missing data scores zero.                                                                                                                       |
| **Risk**     | Independent sizing (8 % allocation cap, 0.5 % risk budget over stop + costs + buffer, 24 % exposure, 3 positions), single-use 45 s authorizations, 6 % initial and trailing stops, durable circuit breakers.                                                                                                  |
| **Executor** | Quote → modelled latency → re-quote → slippage check → fill at the worse price with base + priority fees; failures recorded as failures.                                                                                                                                                                      |
| **Logger**   | Append-only checksummed audit log, double-entry ledger, reconciliation, reports.                                                                                                                                                                                                                              |

## Quick start (local, single host)

Requires Node ≥ 22.13 and pnpm 10.

```bash
pnpm install
```

```bash
pnpm web:build
```

```bash
SETUP_TOKEN=$(openssl rand -hex 24) pnpm --filter @alpha-desk/api dev
```

Open http://127.0.0.1:8787, enter the setup token, create the owner account. In another terminal run
the persistent monitor (discovery, filter, analyst, risk, execution, stops, breakers, reports):

```bash
INITIAL_MODE=DISCOVERY_ONLY pnpm monitor
```

Switch to `PAPER_AUTONOMOUS` from **Paper Trading** when you want overnight paper trading. For a single
discovery + filter pass with a printed funnel: `pnpm discover:once`. Replay recorded data:
`pnpm replay --days 7 --mode RECORDED`.

Both processes share `data/alpha-desk.sqlite` (node:sqlite, WAL). Production uses Cloudflare D1 instead —
see `docs/deployment.md`.

### Credentials that change what the desk can do

| Variable                       | Without it                                                                                             | With it                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `SOLANA_RPC_URL` (private RPC) | Public RPC; `getTokenLargestAccounts` is refused from shared IPs, so F006 errors and DATA_OUTAGE trips | Holder classification works                                                         |
| `HELIUS_API_KEY`               | F006–F009 and the trade-flow factors are UNVERIFIED → **no token can pass**, by design                 | Clustering, developer graph, bundling, unique buyers, buy/sell value, holder growth |
| `JUPITER_API_KEY`              | lite-api, ~1 request/s                                                                                 | Faster quotes for monitoring                                                        |

## Commands

| Command              |                                                                                   |
| -------------------- | --------------------------------------------------------------------------------- |
| `pnpm ci`            | typecheck, lint, format check, all Vitest suites                                  |
| `pnpm test`          | unit, integration (node:sqlite and local D1), failure injection, replay, security |
| `pnpm e2e`           | builds the dashboard and runs Playwright against the local server                 |
| `pnpm monitor`       | the persistent agent runtime                                                      |
| `pnpm discover:once` | one live discovery + filter + analyst pass                                        |
| `pnpm replay`        | historical replay / walk-forward                                                  |

## Layout

`apps/` (api Worker + local server, monitor, web) · `packages/` (shared, config, db, providers, discovery,
security, scoring, risk, execution, ledger, analytics, replay, ai, orchestrator) · `workers/` (cron,
queue consumer, dead-letter consumer) · `infrastructure/` (migrations, Cloudflare setup, Docker, CI) ·
`tests/` (fixtures, integration, failure injection, replay, security, end-to-end) · `docs/`.

Start with `docs/architecture.md`.
