# Data sources and quality

## Registry
`market_data_sources`: key, name, kind (`official` · `licensed` · `admin_verified_import` · `user` · `synthetic`), URL, licence note, default freshness, active flag. Every data point stores: source, instrument identifier, value, currency/unit, methodology (close, NAV, mid, sample…), observation date, retrieval timestamp, verification state (`verified` · `unverified` · `synthetic` · `user_provided`). Freshness thresholds live on instruments (`stale_after_days`) and sources.

## What is connected today
**Nothing live.** The only source installed is `wealthos-sample` (synthetic, for the DEMO portfolio). No dashboard shows fictional rates as if real: synthetic rows are labelled SAMPLE in the UI and the data-quality panel.

## Candidate sources (to evaluate and license — not integrated)
| Data | Candidate source | Notes |
|---|---|---|
| T-bill auctions, discount/true yields, MPR, official FX | Central Bank of Nigeria publications | Official; check reuse terms and formats |
| FGN bonds, savings bonds | Debt Management Office Nigeria | Official |
| NGX equity prices, corporate actions | Nigerian Exchange (NGX) data products | Licensed; redistribution rules |
| Mutual / money-market fund NAVs and yields | SEC Nigeria weekly CIS valuation reports; fund managers' factsheets | Mixed methodologies — store methodology per figure |
| CPI / inflation | National Bureau of Statistics | Official; rebasing history |
| Global ETF prices, FX | Licensed vendor (e.g. exchange or market-data API) | Licence cost — ask before committing |

Until a licensed feed exists, the planned path is an **administrator-controlled verified import** (CSV upload by an admin, validation, preview, provenance, four-eyes approval) — Milestone 3/4.

## Rules
- Prefer official and licensed sources; do not scrape protected sources or breach terms.
- A smaller set of reliably sourced instruments beats a large questionable catalogue.
- Never compare different yield methodologies as if identical (`RateMethodology`, `assertComparable`).
- Stale data is shown with its as-of date and flagged; missing data is never filled with another date's value.
- Synthetic data is always labelled DEMO/SAMPLE.
