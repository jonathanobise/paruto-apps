# Roadmap

Release 1.0 scope and status is tracked in `BUILD_STATUS.md`. After 1.0:

1. **Indexer credentials** — configure Helius (or an equivalent), validate the adapter against live
   responses, then the full Filter and Analyst can pass tokens.
2. **Private RPC + streaming** — Geyser/websocket account subscriptions for pool vaults to move position
   monitoring from quote polling toward event-driven marks.
3. **More pool adapters** — Raydium CLMM, Orca Whirlpool, Meteora DLMM/DAMM v2 (position NFT ownership,
   lock programs with verified expiry: Raydium Burn & Earn, Streamflow, UNCX).
4. **Smart-wallet registry** — build from the desk's own history with point-in-time criteria.
5. **Holder snapshots on a schedule** for organic holder-growth series and related-account detection.
6. **Notifications** — e-mail / push for CRITICAL alerts and the morning report.
7. **Compliance screening** provider for F018 where a jurisdiction requires it.
8. **Multi-user** — the schema already keys portfolios by user; add roles and per-user portfolios.
9. **Strategy research** — parameter sweeps over replay with walk-forward selection.

Live trading is not on this roadmap; it would need its own threat model, custody design and explicit
owner authorization.
