# Architecture decision records

**ADR-001 Modular monolith in Next.js App Router.** One deployable, domain modules under `src/server`, pure engine under `src/engine`. Split later along module boundaries if needed.

**ADR-002 Location.** Built in `wealthos/` of the existing repo (the only repo in scope), excluded from the static showcase publish via `.assetsignore`. Reversible via `git subtree split`.

**ADR-003 PostgreSQL + Drizzle ORM.** Drizzle gives typed SQL with transparent migrations; security-critical SQL (RLS, triggers, SECURITY DEFINER) is hand-written in a custom migration. node-postgres driver (postgres.js 4.0 was days old at selection time).

**ADR-004 Tenant isolation in the database.** RLS with per-transaction `set_config`, membership verified in Postgres (`app_current_org()`), runtime role without owner/bypass privileges, composite FKs. Defence in depth over service checks alone.

**ADR-005 Immutable event ledger.** Typed events stored as validated JSON payloads + normalised per-account entries; append-only enforced by triggers; corrections by reversal; holdings derived by replay. Chosen over full double-entry accounting for MVP clarity; the entries table preserves a double-entry-style audit trail per account.

**ADR-006 Decimal everywhere.** decimal.js (40 digits, half-even); Postgres `numeric`; strings across boundaries. Binary floats only for presentation and IRR root-finding.

**ADR-007 Self-hosted authentication.** The directive suggests managed auth; none was available without vendor credentials, and keeping identity data in our Postgres simplifies NDPA residency. Implemented with vetted primitives only (node:crypto scrypt, AES-GCM, HMAC; RFC 6238), covered by integration tests. Revisit (e.g. Better Auth, a managed IdP) before launch if a vendor is approved; the `identity` module is the seam.

**ADR-008 Versions (Nov 2026).** Next 16.4.3, React 19.3.1, Drizzle 0.45.4, Zod 4.6.7, Tailwind 4.3.3, Recharts 3.10.1, Vitest 5.0.5, Playwright 1.63 (matches the environment's browser). TypeScript 6.0.3 instead of 7.0 (native compiler) because Next's type tooling relies on the JS compiler API. All pinned exactly.

**ADR-009 Design system.** Tokens in `globals.css` (light default, OS dark, explicit toggle); Inter + Fraunces self-hosted via Fontsource (no third-party font requests). Chart series colours validated for contrast and colour-vision deficiency (light `#0F7B57`/`#B45309`, dark `#35A57A`/`#C2611A`, all checks pass). Gains/losses always carry a +/− sign, never colour alone. shadcn-style components written in-repo on Radix.

**ADR-010 Valuation conventions.** End-of-day flow convention for TWR; FIFO default; discount instruments accrete straight-line; missing price → at cost (flagged); missing FX → excluded (flagged). See FINANCIAL_ENGINE.md.

**ADR-011 Demo data.** Demo portfolio is a separate organisation flagged `is_demo`, built through the real ledger service, with deterministic synthetic prices under a `synthetic` source. Never mixed with a user's real organisation.

**ADR-012 Feature gating.** Code registry is the source of truth for classification; compliance decisions are append-only rows; regulated features hard-disabled; `pending_review` blocked in production.

## Open risks
- No legal review yet (COMPLIANCE_MATRIX.md). Terms/Privacy are drafts.
- No live market data; licensing costs unknown.
- No production email provider; verification emails only reach the dev outbox.
- Dashboard recomputes from the full ledger on each request — fine at personal scale; add snapshots/caching before large imports.
- Admin/support access path not yet designed in RLS terms.
- TOTP step replay within 30 s not prevented.
