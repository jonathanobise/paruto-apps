# Data sources and terms

The research platform shows only real data whose terms allow the use we make of it. This file
records each source, what we take, how, and the evidence for the terms (checked 6 Nov 2026).
Quotes are the source's own words. Re-check before any change of use (e.g. going public).

**Current use: private research by the owner.** Public display needs the licences marked below.

## In use (ingested by `npm run ingest -- all`)

| Source | What we ingest | Endpoint | Terms (quoted) |
|---|---|---|---|
| Central Bank of Nigeria | Official exchange rates (daily, Dec 2001 →, ~15 currencies vs NGN, central rate); inflation y/y headline/food/core (monthly, 2003 →); money-market indicators (MPR, interbank, T-bill, deposit and lending rates; monthly, 2006 →); NTB and FGN bond primary auction results (2002 →) | `cbn.gov.ng/api/GetAllExchangeRates`, `GetAllInflationRates`, `GetAllMoneyMarketIndicators`, `GetAllSecuritiesNTB`, `GetAllSecuritiesFGNBond` (the JSON behind the CBN's public rate pages; undocumented) | [cbn.gov.ng/Legal.html](https://www.cbn.gov.ng/Legal.html): "It is permitted to copy material from this Internet address… provided that CBN is stated expressly as the source." "not permitted to amend or distort the contents." |
| Federal Reserve Board | Effective federal funds rate (daily, 2000 →) | Data Download Program, H.15 CSV | Public domain; citation requested (series tagged "Public Domain: Citation Requested"). |
| Bank of England | Bank Rate (changes, 2000 →) | Bank of England Database CSV, series IUDBEDR | [bankofengland.co.uk/legal](https://www.bankofengland.co.uk/legal): "Reproduction of data in the Database is subject to the terms of the UK Open Government Licence" (exceptions: selected exchange-rate data and LSEG-owned data — not used). |
| US Bureau of Labor Statistics | CPI-U index, all items, US city average, NSA (CUUR0000SA0; monthly, 2000 →) | Public Data API v2 (`BLS_API_KEY` optional: without it ~25 requests/day, 10 years per request) | [bls.gov copyright](https://www.bls.gov/opub/copyright-information.htm): "everything that we publish… is in the public domain"; citation requested. |
| Office for National Statistics | CPI index, all items, 2015 = 100 (D7BT; monthly) | ONS time-series CSV | [ons.gov.uk T&Cs](https://www.ons.gov.uk/help/termsandconditions): "All content is available under the Open Government Licence v3.0." Attribution: "Source: Office for National Statistics licensed under the Open Government Licence v3.0." |

Derived series are computed by us and say so (source kind `derived`):
- **Nigerian T-bills, 91-day rolled (total-return index):** buy the 91-day bill at each CBN primary
  auction, hold to maturity, roll into the first auction on or after maturity (cash earns nothing
  while waiting); valued at amortised cost between purchase and maturity; actual/365 discount basis.
  `rolledBillIndex` in `src/engine/market-performance.ts`.

## Not yet in use

| Source | Data | Terms / cost | Next step |
|---|---|---|---|
| **EODHD** (recommended for prices) | End-of-day prices, dividends and splits: US, LSE, global ETFs **and NGX (XNSA, 159 tickers)**; 30+ years; FX | Personal plans $19.99–99.99/mo forbid "displaying" (to others); Commercial Internal $399/mo forbids display outside the company; display rights by quote (Enterprise $2,499/mo; Custom "from $399/mo") | Owner approval for a personal plan for the private phase; confirm in writing that a single-user private app is personal use; get a display quote before going public, including XNSA provenance |
| NGX (direct) | NGX equity EOD prices, dividends, index values | EOD Prices API ₦125k/yr; Website/Mobile EOD licence ₦120k/yr; Historical Data Redistribution ₦1.25m/yr (+VAT). Policy §8.2.6: redistribution needs "prior written permission from NGX" | Needed before showing NGX data publicly, even if prices come from a vendor |
| SEC Nigeria | Weekly NAV and unit price of every collective investment scheme, 2011 → (XLSX) | Terms of Use page has no body text: reuse unstated | Ask SEC for written permission; ingest privately in the meantime only with owner approval |
| DMO | Eurobond daily prices/yields; FGN bond auction summaries; Savings bonds | "All Rights Reserved"; no reuse licence. The site also refuses automated downloads of its files (HTTP 403, checked 11 Nov 2026) | Ask DMO for permission and a data file. Meanwhile the FGN 10-year market yield comes from EODHD (below) |
| IMF (Monetary and Financial Statistics, interest rates) | Checked 11 Nov 2026: for Nigeria only T-bill yield, deposit, lending and policy rates (monthly, to Apr 2026); no government bond yield | Free with attribution | Not needed: the CBN publishes the same rates daily/monthly |
| NBS | CPI index levels, inflation reports | Reported: no redistribution "without the written agreement" of NBS (page did not load for verification) | We use the CBN's republication of the inflation rates; confirm with NBS before public launch |
| FMDQ | Secondary-market T-bill and FGN bond quotes | Redistribution licence ₦13.4m/yr; "may not be… displayed… without the prior written consent of FMDQ Group" | Deferred; primary-auction rates from the CBN instead |
| Index providers (S&P DJI, FTSE Russell, NGX ASI) | Index levels | Licensed for display | Show tracking ETFs instead until licensed |

**EODHD government bond yields** (in use on the private deployment, under the same personal plan and
terms as the prices): daily 10-year yields for Nigeria (`NG10Y.GBOND`, the only Nigerian tenor EODHD
carries), the US and the UK, ingested with the EODHD task as licensed macro series and never shown on
the public demo. Before any public display, the display licence must cover these series too.

## Rules
- Store provenance for every value (source, methodology, retrieval time); never fill gaps.
- Show the attribution required by each source wherever its data appears.
- Never use a source against its terms (e.g. Yahoo Finance's terms forbid this use; not used).
