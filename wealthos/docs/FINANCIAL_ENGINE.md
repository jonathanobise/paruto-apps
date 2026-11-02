# Financial engine (`src/engine`)

Pure, deterministic TypeScript. Same inputs → same outputs. No I/O. The AI layer (M3) and every screen use these functions for numbers; no LLM arithmetic.

## Arithmetic
- `Decimal` = decimal.js clone, 40 significant digits, ROUND_HALF_EVEN. Money is `Money(amount, currency)`; mixing currencies throws.
- Rounding happens only at presentation/settlement, per currency policy (`currency.ts`, ISO minor units).
- Rates (returns, IRR, volatility) are ratios. XIRR's root search runs in binary64 with 1e-12 step tolerance; its inputs are Decimal and output is rounded to 10 dp. Documented exception.

## Ledger model
Typed events (`types.ts`): deposit, withdrawal, buy, sell, dividend, interest, coupon, fee, tax, fx_conversion, transfer, security_transfer, reinvestment, split, stock_dividend, maturity, redemption, opening_position, reversal.
- Trades settle in the instrument's currency; cross-currency purchases require an explicit `fx_conversion` first (no hidden FX).
- Buy fees are capitalised into cost basis and also reported as fees. Sale proceeds are net of fees.
- Dividends/interest record gross, withholding tax and net cash.
- Reversals: `effectiveEvents()` removes the reversed event and its reversal. Double/dangling reversals throw.
- Replay order: date, then recording order.

## Lots and cost basis
FIFO by acquisition date (default) or AVERAGE. Each lot keeps acquisition date, remaining quantity, cost (instrument currency) and cost in base currency at **acquisition-date FX** (null if that rate is missing — never guessed).
- **Split** n:d: quantity × n/d, cost unchanged.
- **Stock dividend / bonus issue:** quantity increases pro rata across existing lots; total cost unchanged.
- **Security transfer:** lots move with original dates and cost — not a disposal.
- **Maturity of discount instruments (T-bills):** the gain over cost is classified as *interest* (discount accretion), not capital gain.
- Overselling raises `InsufficientQuantityError` (no shorts).

## Flows and scope
A flow is external when value crosses the boundary of the analysis scope (set of accounts): deposits, withdrawals, opening positions (valued at market), and transfers whose counterparty is outside the scope. Transfers between in-scope accounts are internal — **moving money between your own accounts is never a contribution or a return, and deposits are never profit.**

## Valuation policies
| Situation | Policy | Flag |
|---|---|---|
| Price exists on/before date | Use latest on/before; never a later one | STALE_PRICE if older than instrument `staleAfterDays` |
| No price, discount instrument | Straight-line accretion from cost to face at maturity | MODEL_VALUATION; MATURED_NOT_REDEEMED after maturity |
| No price, other | `cost` (default): value at cost basis; `exclude`: leave out of totals | VALUED_AT_COST / MISSING_PRICE |
| FX on/before date within `maxAgeDays` (5) | Use it; inverse pair if needed; triangulate via USD | STALE_FX (>3 days), TRIANGULATED_FX |
| No FX in window | **Item excluded from base totals; result `complete = false`**. Today's or any other date's rate is never substituted | MISSING_FX |
| Synthetic data | Used and labelled | SYNTHETIC_DATA |
| Manual assets / liabilities | Latest declared valuation on/before date × ownership % | Valuations > 180 days flagged in the dashboard |
| Backdated transactions | Allowed; full replay validates all later history | — |
| Closed accounts | No events after `closed_on`; ledger accounts must be empty to close | — |

## Performance (`performance.ts`)
- Valuation points: start, end, all month-ends, all event dates in the period.
- **Start value** = end-of-day value on the start date (flows on that date are part of it).
- **TWR**: flows at *end of day*; sub-period return `(V_b − F_b) / V_a − 1`; chain-linked. Sub-periods starting at zero value are skipped.
- **XIRR**: investor perspective (−start value, −contributions, +withdrawals, +end value), ACT/365 exponent as spreadsheet XIRR.
- **Annualisation** only for periods ≥ 365 days (GIPS practice).
- **Bridge**: `end − start = net contributions + investment gain`; gain shows income (gross), fees, withholding tax, realised gains and **FX effect** = gain − gain recomputed with all FX frozen at start-date rates (an explicit counterfactual, not a substitution).
- Any missing FX/price in the period → `complete = false`, TWR/XIRR withheld (shown as "—" with an explanation).

## Account and holding performance
- **Account**: `analyzePerformance` with a one-account scope. Transfers to/from your other accounts are that account's contributions/withdrawals (not returns), so bank → broker funding never looks like profit at either end.
- **Holding** (`holding-performance.ts`): one instrument in one account, treated as a mini-portfolio. Money in: purchases incl. fees, holding-specific fees/taxes, opening positions and securities transferred in (at market value). Money out: net sale proceeds, maturity/redemption proceeds, net income paid out, securities transferred out. Reinvested income nets to zero but counts as income. Splits/bonus issues are not flows. Same end-of-day TWR convention; XIRR on the same flows.
- Every holding result is reported twice: **local** (instrument currency — the investment's own performance, ex-FX) and **base** (display currency — including currency moves). Base is withheld (null) if any FX rate in the period is missing.
- Single-currency shortcut: when nothing in the ledger is in a non-base currency, the FX effect is exactly zero and the constant-FX counterfactual pass is skipped.
- XIRR never reports −0.

## Risk, allocation, planning
- Volatility: sample stdev × √periods/yr. Max drawdown on a growth index (never on raw value, which deposits distort). Sharpe returns its assumptions (risk-free rate, label, periodicity) with the number.
- Allocation by asset class, geography, currency; concentration via HHI, effective number of holdings, top-N, user threshold breaches.
- Drift vs a user-defined target: descriptive only (no trade instructions).
- Projections: start balance, per-period contributions (beginning/end), contribution growth, compounding 1/4/12, fees, inflation-deflated real values, explicit "taxes not modelled" and "not guaranteed" disclosures; `projectScenarios` refuses a single scenario. `requiredContribution` solves the level contribution (round-trip tested). Purchasing power, CPI deflation, fee drag, documented stress shocks.
- Fixed income: discount price, discount → true yield → effective annual yield, nominal → effective, simple interest (ACT/365|364|360|ACT), coupon schedules, fixed-deposit cash flows net of WHT. **Rate methodologies** are typed; `assertComparable` refuses to compare e.g. a T-bill discount rate with a fund's published yield.

## Test fixtures (independent references)
- Spreadsheet XIRR documentation example → 0.3733625335.
- TWR/XIRR scenario (100 → +55 contribution → 181.5) hand-computed: TWR 21%, gain 26.5, XIRR 20.9621% (Python bisection).
- FIFO/average-cost sale (fees capitalised) hand-computed: gains 532 / 494.
- T-bill: 18% discount, 364 days → price 82.0493150685, true yield 0.2193802591, EAY 0.2194418565 (Python `decimal`).
- Volatility/Sharpe from Python `statistics`.
- Holding: buy 100 @ 10, dividend 50 − 5 WHT, sell 50 @ 13, 50 left @ 14 → TWR 45.25% (1245/1000 × 1300/1200 × 700/650), gain 395, XIRR 58.56605% (Python); USD ETF $100 → $110 with USD/NGN 1500 → 1650 → local +10%, NGN +21%.
- Annuity FV 331 / 364.1; inflation deflation; FX attribution (constant USD price, USD/NGN 1500 → 1650 ⇒ gain is 100% FX).

## Known limitations (planned)
Accrued interest on coupon bonds; day-count/settlement conventions per market; corporate actions from a catalogue feed (currently entered per organisation); tax lots for specific-identification; multi-currency cash in performance attribution by currency pair; holding performance replays the ledger once per holding (≈0.85 s for 10 holdings × 2,400 events, uncached).
