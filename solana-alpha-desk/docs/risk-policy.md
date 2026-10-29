# Risk policy

All values below are the defaults in `packages/config/src/strategy.ts` (strategy `alpha-desk-v1.0.0`).
Every change creates a new content-hashed configuration version; candidates evaluated under a superseded
version expire instead of trading.

## Position sizing

```
allocation limit   = equity × 8 %
risk budget        = equity × 0.5 %
loss fraction      = 6 % stop + est. entry cost % + est. exit cost % + 1.5 % execution buffer
risk-sized notional = risk budget ÷ loss fraction
final notional     = min(allocation limit, risk-sized notional, 2 % of on-chain pool liquidity,
                         cash − fee reserve, 24 % of equity − open exposure)
```

Estimated costs come from fresh Jupiter quotes at the planned size versus the last-trade price, plus
base + priority network fees. Orders below $10, entries costing more than 3 %, or a round trip above 6 %
are rejected. The stop is a **trigger**, not a guaranteed loss boundary: exits are simulated at the route
available when it fires, and gaps, impact and failed exits are recorded as they happen.

Never: borrowing, leverage, averaging down, martingale, or two positions in one token (unique index).
At most 3 concurrent positions and 12 entries per local day.

## Authorization

A `RISK_AUTHORIZED` decision is a row in `risk_authorizations` bound to one mint, one proposed order, one
portfolio, one maximum notional and one configuration version, valid for 45 s. The Executor re-validates
it against a fresh quote (price move ≤ 3 %), then consumes it in the same atomic write that creates the
order. A database trigger refuses a second consumption and `paper_orders.authorization_id` is unique, so
an authorization can never produce two fills.

## Stops

- Initial stop = entry executable reference × 0.94. The entry reference is the executable **sell** quote
  for the position's full size right after the fill (the same measure used for every later mark).
- Trailing activates when a fresh executable reference reaches entry × 1.12; the trail is the highest
  valid reference × 0.94.
- Effective stop = max(previous effective stop, trail). It is never lowered — in code and by a database
  trigger.
- Marks come every ~2 s from sell quotes for the full quantity. If no route exists, the last-trade price
  is watched as a non-executable alarm; when it crosses the stop, or the route has been missing for 20 s,
  a protective exit is attempted. Failed exits are retried with wider slippage tolerance every 5 s and
  raise alerts (critical from the third attempt).
- Stops live in the database and the monitor; they keep working with the dashboard closed and after
  restarts.

## Portfolio controls and circuit breakers

| Breaker              | Trips when                                                                          | Reset condition                                      |
| -------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------- |
| DAILY_LOSS           | equity ≤ 97 % of the local day's opening equity                                     | only on a later local day                            |
| MAX_DRAWDOWN         | equity ≤ 92 % of peak equity                                                        | reset re-bases the peak to current equity (recorded) |
| DATA_OUTAGE          | DexScreener, Jupiter or Solana RPC ≥ 50 % errors (≥ 5 calls) or no success in 5 min | feeds healthy again                                  |
| VERIFICATION_QUALITY | > 50 % of ≥ 4 filter runs in 30 min ended FILTER_ERROR                              | phrase + reason                                      |
| DB_INTEGRITY         | ledger reconciliation fails (also pauses entries)                                   | a reconciliation passes at reset time                |
| ROUTE_FAILURES       | ≥ 5 failed paper orders in 30 min                                                   | phrase + reason                                      |
| EMERGENCY_PAUSE      | owner pressed Emergency pause                                                       | phrase + reason; required before leaving the mode    |
| LIQUIDITY_WITHDRAWAL | an open position's pool liquidity fell ≥ 30 % since discovery (also exits it)       | phrase + reason                                      |
| DEVELOPER_MOVEMENT   | the deployer moved ≥ 0.5 % of supply while we hold (also exits)                     | phrase + reason                                      |
| API_BUDGET           | provider calls today exceed the configured cap (discovery also stops)               | phrase + reason                                      |

Breakers block **new entries only**. Open positions stay under protective monitoring.

### Reset procedure

1. Open **Risk Center**, read the breaker's detail and the linked alerts.
2. Resolve the cause (e.g. wait for feeds to recover, investigate the reconciliation issues).
3. Press **Reset…**, give a reason of at least 10 characters, and type the exact phrase
   `RESET <BREAKER>` (for example `RESET DAILY_LOSS`).
4. The server re-checks the condition; if it still holds, the reset is refused. A successful reset writes
   a `circuit_breaker_events` RESET row and an audit event naming you, the phrase and the reason.

In production, administrative actions require MFA to be enrolled and verified for the session.
