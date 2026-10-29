# Operations runbook

## Daily

- **Morning report** (generated at the configured local hour, default 07:00 UTC): equity change, closed
  trades, open positions, funnel, breakers, alerts. Reports → open the latest.
- **System Health**: every critical provider green, reconciliation PASSED within 5 minutes, no dead
  letters, monitor heartbeat < 1 minute old.

## Starting an overnight paper session

1. System Health green; Risk Center shows no tripped breakers.
2. Paper Trading → `PAPER_AUTONOMOUS`. The monitor discovers every minute, filters, scores, authorizes
   and paper-trades within the risk limits; positions are marked every ~2 s.
3. Leave the dashboard closed if you like — everything runs in the monitor.

## Alerts and what to do

| Alert / breaker                           | Meaning                                           | Action                                                                                                                                                                 |
| ----------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DATA_OUTAGE                               | a critical provider is failing                    | check provider status; a private `SOLANA_RPC_URL` fixes most cases; reset once healthy                                                                                 |
| DB_INTEGRITY                              | ledger and positions disagree; entries paused     | read the reconciliation issues (System Health); never edit rows by hand — add a CORRECTION journal through code if a bug caused it; reset once a reconciliation passes |
| Paper exit failed                         | the simulated sell could not fill                 | the monitor retries every 5 s with wider slippage; repeated failures usually mean the pool lost its liquidity — the position stays EXIT_FAILED until a route returns   |
| No executable route for an open position  | Jupiter cannot route the token                    | a protective exit is attempted; watch the position                                                                                                                     |
| LIQUIDITY_WITHDRAWAL / DEVELOPER_MOVEMENT | possible rug in progress; the position was exited | review the token page; reset when satisfied                                                                                                                            |
| Work item dead-lettered                   | a stage failed 5 times                            | System Health → Dead letters shows the error; fix the cause; the candidate expires on its own                                                                          |
| Monitor heartbeat missing                 | the monitor is down                               | restart it (`docker compose restart monitor` / `systemctl restart alpha-desk-monitor`); it recovers on start (see below)                                               |

## Restart recovery (automatic)

On every start the monitor: marks orders left PENDING by a crash as FAILED (their authorizations stay
consumed, so they are never re-executed); returns interrupted exits to EXIT_FAILED for a retry;
expires lapsed approvals and authorizations; reconciles the ledger (pausing entries if it fails); and
resumes monitoring every open position from its persisted stop state. Expired work-item leases are
re-delivered.

## Emergency

- **Emergency pause**: Paper Trading → Emergency pause. Blocks all entries; stops stay active.
- **Liquidate (simulated)**: Paper Trading → Liquidate, type `LIQUIDATE ALL`.
- **Stop everything except protection**: switch to `STOPPED`; open positions are still protected only
  while the monitor runs, so keep it running.

## Resetting the paper portfolio

Close or liquidate open positions, then Paper Trading → Reset portfolio, type `RESET PORTFOLIO`. The old
portfolio is archived with its whole history; a fresh one starts with the configured equity.

## Retention

Every 6 hours: market snapshots older than 14 days and marks of closed positions older than 30 days are
archived to object storage as JSONL (checksum in the audit log) and pruned; provider-health minutes after
30 days, finished work items after 7 days, rate-limit and nonce rows after hours. Security evidence,
orders, fills, positions, ledger, audit events and reports are never pruned.

## Backups and disaster recovery

- D1: Time Travel gives point-in-time restore for 30 days; export weekly with
  `wrangler d1 export solana-alpha-desk --remote --output backup.sql` to an encrypted location.
- R2: evidence and reports are content-addressed and immutable; enable bucket versioning.
- Local mode: copy `data/alpha-desk.sqlite` (with the `-wal` file) while the monitor is stopped, or use
  `sqlite3 .backup`.
- Recovery: restore D1, restart the monitor (recovery + reconciliation run automatically), confirm System
  Health, resume the mode.
