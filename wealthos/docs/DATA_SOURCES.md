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

## Administrator-verified import (built)
Until a licensed feed exists, data enters only through the admin console (`/admin`), available to platform administrators with two-step verification (granted by an operator via `scripts/grant-admin.ts`; Postgres re-checks the role on every write):
1. **Register the source** with its kind (official / licensed / admin-verified import), URL, licence or terms note and freshness threshold.
2. **Catalogue instruments** with identity (name, ticker, ISIN, issuer, class, currency, country, valuation model, maturity) and structured facts (charges, minimums, liquidity, distributions, benchmark, risks, tax notes). An instrument is marked *verified* only with a cited official source URL and as-of date; users see facts only for verified instruments.
3. **Import** prices/NAVs, published rates (with methodology, tenor, basis, source URL) or FX rates as CSV: rows are validated and previewed, then committed as `verified` under the chosen source. Corrections update in place and invalidate analytics caches. Expected returns are refused — they are assumptions, not published data.
Planned: second-admin approval (four-eyes) before commit, and scheduled pulls from licensed APIs through the same validation.

## Rules
- Prefer official and licensed sources; do not scrape protected sources or breach terms.
- A smaller set of reliably sourced instruments beats a large questionable catalogue.
- Never compare different yield methodologies as if identical (`RateMethodology`, `assertComparable`).
- Stale data is shown with its as-of date and flagged; missing data is never filled with another date's value.
- Synthetic data is always labelled DEMO/SAMPLE.
