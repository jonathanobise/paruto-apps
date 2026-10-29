# Build status — Solana Alpha Desk 1.0

_Last updated 29 Oct 2026. Branch `claude/sweet-wright-esc0w9` of `jonathanobise/paruto-apps`, folder
`solana-alpha-desk/` (excluded from the apps.paruto.com deployment)._

## Summary

The desk runs end to end: live discovery from DexScreener/GeckoTerminal, on-chain verification over
Solana RPC, Jupiter executable quotes, scoring, risk authorization, simulated fills, stop management,
breakers, ledger, audit, reports, replay, and an authenticated dashboard. Automated tests prove the
complete paper-trading lifecycle and every listed failure mode on both node:sqlite and a real D1 binding.

**What stops live paper trades today is credentials, by design.** Without a holder/transaction indexer
(Helius) the Filter cannot establish beneficial-owner clustering, developer history or launch bundling,
so it returns `FILTER_UNVERIFIED` and nothing advances. Without a private RPC, the public endpoint refuses
`getTokenLargestAccounts`, which makes the holder check error and keeps the DATA_OUTAGE breaker tripped.

## Completed features

| Milestone                | Status     | Notes                                                                                                                                                                                                                                |
| ------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0 Foundation             | ✅         | pnpm monorepo, strict TS, migrations (3), config versioning, auth (setup token, PBKDF2, TOTP MFA, sessions, CSRF, rate limits), provider interfaces, test scaffolding, CI workflow template                                          |
| 1 Real discovery         | ✅         | DexScreener feeds + `/tokens/v1`, GeckoTerminal new pools, normalised tokens/pools/snapshots, dedup (one active run per token), Discover terminal with real timestamps                                                               |
| 2 Security verification  | ✅         | F001–F018 with evidence matrix; pool adapters PumpSwap / Raydium CPMM / Raydium AMM v4 (verified on live accounts); holder classification; developer and bundle analysis (indexer-backed); rejection ledger; Token Intelligence page |
| 3 Analyst                | ✅         | six versioned factors, config-driven curves, ranking + ranking history, factor detail UI                                                                                                                                             |
| 4 Risk & paper execution | ✅         | sizing, single-use authorizations, Jupiter quote adapter, fill simulator, double-entry ledger, initial + trailing stops, breakers, position monitoring                                                                               |
| 5 Autonomous operation   | ✅ (local) | persistent runtime with supervised loops, durable queue + DLQ, heartbeats, agent dashboard, alerts, runbook, restart recovery, scheduled reports, retention                                                                          |
| 6 Research               | ✅         | replay engine (no look-ahead), dev/validation/test split, walk-forward, strategy versioning, analytics + segments, JSON report export                                                                                                |

## Tests executed (29 Oct 2026)

| Check                                                                                                                          | Result                   |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------ |
| `tsc` — root, Worker, data-plane Workers, web                                                                                  | pass                     |
| ESLint (incl. ban on signing/broadcast calls)                                                                                  | pass                     |
| Prettier                                                                                                                       | pass                     |
| Vitest — 16 files, **136 tests**: unit, integration (node:sqlite + local D1/workerd), failure injection, replay, security, API | **136 passed**           |
| Playwright end-to-end (2 tests: full UI flow incl. reset procedure and mobile, unauthenticated refusal)                        | **2 passed**             |
| `pnpm audit --prod`                                                                                                            | no known vulnerabilities |
| `next build` (static export, 16 routes)                                                                                        | pass                     |
| `wrangler deploy --dry-run` (discovery-scheduler)                                                                              | bundles (196 KB gzip)    |
| `wrangler d1 migrations apply --local`                                                                                         | all 3 applied            |
| `wrangler dev` API Worker: bootstrap, setup, login, overview, static dashboard                                                 | pass                     |
| Monitor → signed bridge → Worker → D1 with live mainnet discovery                                                              | pass, zero errors        |

Live runs against real providers (not CI): `discover:once` evaluated 59 real tokens (4 discovered, all
filtered with evidence); a ~40-minute local monitor session discovered and filtered real candidates;
replay ran on 85 recorded observations.

## Integration status

| Integration                           | Status                                                                                              |
| ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| DexScreener                           | OPERATIONAL                                                                                         |
| GeckoTerminal                         | OPERATIONAL (frequent 429 on shared IPs; supplementary)                                             |
| Solana RPC (public)                   | DEGRADED — `getTokenLargestAccounts` refused from this host; ~65 % of calls rate limited in testing |
| Jupiter (lite-api)                    | OPERATIONAL                                                                                         |
| RugCheck                              | OPERATIONAL (corroboration only)                                                                    |
| Helius                                | **BLOCKED_BY_CREDENTIALS** — adapter implemented to the documented API, not exercised live          |
| Anthropic / OpenAI (report summaries) | adapters present, unused by default, never used for decisions                                       |
| Cloudflare D1 / R2 / Queues / Workers | code and configs ready; verified locally (workerd); **not provisioned or deployed**                 |

## Required credentials

| Name                      | Where                           | Purpose                 | Needed for                                               |
| ------------------------- | ------------------------------- | ----------------------- | -------------------------------------------------------- |
| `SETUP_TOKEN`             | API Worker secret / local env   | one-time owner creation | first sign-in                                            |
| `BRIDGE_SECRET`           | API Worker secret + monitor env | signed SQL bridge       | production monitor                                       |
| `SOLANA_RPC_URL`          | all services                    | private RPC             | reliable holder checks, no DATA_OUTAGE                   |
| `HELIUS_API_KEY`          | all services                    | indexer                 | any token passing the Filter; Analyst trade-flow factors |
| `JUPITER_API_KEY`         | all services                    | api.jup.ag              | faster quotes (optional)                                 |
| Cloudflare account access | deploy                          | D1, R2, Queues, Workers | deployment                                               |

## Deployment status

Not deployed. No Cloudflare resources were created; the commits have not been pushed (pushing and
deploying need the owner's go-ahead, per this repository's rules). See `docs/deployment.md` for the
exact steps. The Docker image for the monitor is written but was not built (no Docker daemon in the
build environment); the esbuild bundle it packages was run and served `/healthz`.

## Known limitations

- No live paper trades are possible until an indexer key (and ideally a private RPC) is configured — the
  intended fail-closed behaviour.
- Supported pools: PumpSwap AMM, Raydium CPMM, Raydium AMM v4. Concentrated-liquidity pools, bonding
  curves and LP lock programs are rejected (F017) or treated as withdrawable.
- Partial fills are not modelled (Jupiter swaps are atomic); fills use the worse of quote and landing
  re-quote plus fees.
- Position monitoring polls Jupiter every ~2 s (keyless lite-api ≈ 1 request/s limits this to a few
  positions); latency objectives are not claimed until measured in deployment.
- Holder growth needs repeated indexer holder counts; the smart-wallet registry starts empty, so that
  factor scores 0 until built.
- Developer rug detection implements criterion R1 (deployer-linked liquidity withdrawal) only.
- Replay uses recorded last-trade prices and a cost model, not historical executable quotes; research
  mode is explicitly retrospective.
- Sharpe/Sortino need ≥ 30 daily returns; the 100-trade validation threshold is an observation target,
  not proof of profitability.
- `node:sqlite` is marked experimental in Node 22 (used locally; production uses D1).

## Remaining acceptance criteria

| Definition of done item                                        | Status                                          |
| -------------------------------------------------------------- | ----------------------------------------------- |
| 1 deployed and authenticated                                   | authentication ✅; deployment ⏳ owner approval |
| 2 six agents as independent logical services                   | ✅                                              |
| 3 real Solana data feeds connected                             | ✅ (keyless); indexer ⏳ credentials            |
| 4 every security check implemented or blocks when unverifiable | ✅                                              |
| 5 scores from genuine observations                             | ✅                                              |
| 6 risk approvals enforce every limit                           | ✅                                              |
| 7 defensible execution simulation                              | ✅                                              |
| 8 balances reconcile                                           | ✅                                              |
| 9 stops and breakers survive restarts                          | ✅ (tested)                                     |
| 10 every rejection recorded                                    | ✅                                              |
| 11 dashboard shows persisted results                           | ✅                                              |
| 12 overnight paper operation functional                        | ✅ runtime; real fills ⏳ credentials           |
| 13 accurate daily reports                                      | ✅                                              |
| 14 critical tests pass                                         | ✅                                              |
| 15 no live transaction can be submitted                        | ✅ (enforced and tested)                        |
| 16 source and deployment docs                                  | ✅                                              |
| 17 limitations and dependencies documented                     | ✅                                              |
