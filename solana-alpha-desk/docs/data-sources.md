# Data sources

| Provider            | Used for                                                                                                                     | Endpoint(s)                                                                                                                                                                          | Credentials                 | Status (29 Oct 2026)                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- | ------------------------------------------------------------------------------------------------- |
| DexScreener         | discovery feeds, pair market data                                                                                            | `/token-profiles/latest/v1`, `/token-boosts/latest/v1`, `/token-boosts/top/v1`, `/community-takeovers/latest/v1`, `/tokens/v1/solana/{≤30 mints}`, `/latest/dex/pairs/solana/{pair}` | none                        | OPERATIONAL (verified live)                                                                       |
| GeckoTerminal       | supplementary new-pool discovery                                                                                             | `/api/v2/networks/solana/new_pools`                                                                                                                                                  | none                        | OPERATIONAL, often 429 on shared IPs (non-critical)                                               |
| Solana RPC          | mint authorities, extensions, supply, pool state, LP mint, vaults, largest holders, owners, deployer holdings, priority fees | JSON-RPC `getAccountInfo`, `getMultipleAccounts`, `getTokenSupply`, `getTokenLargestAccounts`, `getTokenAccountsByOwner`, `getRecentPrioritizationFees`                              | optional (`SOLANA_RPC_URL`) | public endpoint works but **refuses `getTokenLargestAccounts`** from this host; use a private RPC |
| Jupiter Swap API v1 | executable buy/sell quotes, SOL/USD                                                                                          | `GET /swap/v1/quote` on `lite-api.jup.ag` (keyless) or `api.jup.ag` (`JUPITER_API_KEY`)                                                                                              | optional                    | OPERATIONAL (verified live)                                                                       |
| RugCheck            | corroborating claims only (never decisive)                                                                                   | `/v1/tokens/{mint}/report/summary`                                                                                                                                                   | none                        | OPERATIONAL                                                                                       |
| Helius              | holder counts (DAS `getTokenAccounts`), Parsed Events transaction history (10 credits a page)                                | `mainnet.helius-rpc.com/v1/parsed-events/transaction-history`, `mainnet.helius-rpc.com`                                                                                              | `HELIUS_API_KEY`            | OPERATIONAL (daily credit budget, Settings → Runtime)                                             |

## Provenance

Every response used in a decision becomes an `evidence` row: provider, endpoint (API keys are never
recorded), observed and ingested timestamps, slot when the RPC reports one, SHA-256 of the raw body and
the storage key of the raw payload in R2 (or `data/evidence/` locally). Each record is classed
`ON_CHAIN`, `PROVIDER_CLAIM` or `DERIVED`. Rule results, scores, authorizations and fills cite evidence
ids; the dashboard opens the payload from any rule.

## What the Filter can and cannot verify today

With the keyless sources:

- **Verified on-chain**: mint/freeze authorities, Token-2022 extensions, token program, pool program and
  layout (PumpSwap AMM, Raydium CPMM, Raydium AMM v4 — offsets checked against live accounts), LP burned
  vs outstanding, LP holders at burn addresses, quote-vault balance → on-chain liquidity, deployer
  holdings (PumpSwap `coin_creator`).
- **Lower bounds only** (can fail a token, cannot pass it): top-10 concentration without clustering,
  developer ownership without the linked-wallet graph.
- **Needs an indexer**: beneficial-owner clustering, developer history (prior tokens, rug criterion R1),
  launch bundling, unique buyers, buy/sell traded value, holder growth, smart wallets.

So without `HELIUS_API_KEY`, every candidate ends `FILTER_UNVERIFIED` at best. That is the specified
fail-closed behaviour, not a bug. With a key, the Helius adapter (implemented, untested against the live
API because no key was available) supplies those facts.

## Discrepancies

On-chain facts win for authorities. Liquidity (on-chain vs DexScreener), FDV (supply × price vs
DexScreener) and price (executable vs last trade) are compared; more than 15 % divergence fails F014.
Values are never averaged. On 29 Oct 2026 this caught a live token whose DexScreener market cap ignored
~half the supply having been burned.

## Rate limits and quotas

The shared HTTP client paces each provider, retries with exponential backoff and jitter, honours
`Retry-After` / `x-ratelimit-reset`, and opens a per-provider circuit after 5 consecutive failures for
60 s. Calls are counted per minute in `provider_health`; the daily total feeds the API_BUDGET breaker.

## Licensing and retention

DexScreener, GeckoTerminal, Jupiter and RugCheck data are used under their public API terms for private
research; raw payloads are kept only as audit evidence. Raw market snapshots are archived to object
storage after 14 days (`docs/operations-runbook.md`). Review each provider's terms before any
redistribution.
