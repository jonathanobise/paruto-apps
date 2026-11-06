# Milestone 5 — expansion: what's built, what's gated, what it would take

Status (2 Nov 2026). Built and tested: household planning, the institution-connections framework (no provider), support and compliance staff roles, the jurisdiction framework (Nigeria only), and the installable web app. **Not built, by design:** adviser workspaces and any regulated advisory feature (they stay hard-disabled), native app-store apps, and offering WealthOS outside Nigeria. Each needs owner, legal or vendor decisions first.

## 1. Authorised institution connections
**Built:** consent-scoped, read-only connections for bank and cash accounts (`src/server/connections`). Scopes (balances, transactions) and duration (≤ 90 days) are chosen by the user; provider credentials are encrypted at rest and deleted on disconnect or expiry; consent is recorded (`institution_data_access`); syncs run daily and create an **import preview** the user reviews — nothing reaches the ledger without them; the provider's transaction ids are references, so re-syncs never duplicate. Feature `INSTITUTION_CONNECTIONS` is `pending_review`.
**Not connected:** no data provider. A sandbox test double (labelled *SANDBOX TEST DATA*) exists only outside production with `CONNECTIONS_SANDBOX=1`.
**To connect a provider:** choose a provider operating under the CBN open-banking framework (or equivalent), sign its contract and data-processing agreement, confirm with counsel whether WealthOS must register as a participant, then implement `ConnectionProvider` (`completeLink` from the provider's consent widget, `fetchTransactions`, `revoke`), add the secret to the environment and test in the provider's sandbox. Brokerage/holdings feeds would extend the same interface with positions.

## 2. Household planning
**Built:** shared household/business spaces (M4) plus per-account ownership by member, net worth by person and "shared/unassigned", always reconciling to the space's net worth. Ownership is a planning view, not legal title.
**Next ideas (not built):** goals attributed to a member, per-person reports, spending/budgeting from connected accounts.

## 3. Staff roles
**Built:** support agents (support queue, people/organisation look-up, sign-out-everywhere, read-only billing) and compliance reviewers (audit trail, AI usage metadata, feature gates, recording compliance decisions in-app). All need 2FA; Postgres re-checks the role. Compliance decisions can no longer be written by anyone else, even with raw SQL.

## 4. African country expansion
**Built:** jurisdiction catalogue (`src/lib/jurisdictions.ts`) — Nigeria offered; Ghana, Kenya, South Africa planned and **not offered**; every feature lists allowed jurisdictions (NG only) and tests prove nothing is available elsewhere in any environment, even if approved. Accounts can be recorded in GHS, KES, ZAR, XOF and EGP (conversion only with dated FX rates).
**Per country, before launch (owner + local counsel):**
1. Regulatory review of every feature in the compliance matrix with local counsel (capital-markets regulator in the catalogue entry; confirm the boundary between information/tools and regulated advice).
2. Data protection: registration/notification with the local authority, cross-border transfer basis for hosting and vendors, local privacy notice.
3. Local market data sources and licences; FX sources for the local currency.
4. Payment provider and tax treatment for local billing; local-currency prices.
5. Localised education content and disclosures.
6. Add the jurisdiction to each approved feature's `jurisdictions`, set `offered: true`, record compliance decisions.

## 5. Mobile applications
**Built:** installable web app (manifest, icons, standalone mode). The service worker deliberately caches **nothing but a static offline page** — no financial data is stored on the device. All screens are checked at phone width in browser tests (no sideways scrolling).
**Native apps (not built):** need Apple and Google developer accounts (paid), a token-based JSON API (today the web app uses server actions and cookies), secure on-device storage, biometric unlock, push notifications (provider choice) and app-store review including finance-category requirements. Recommended path: React Native/Expo client over a versioned `/api/v1` with short-lived tokens and refresh rotation, reusing the server services; decide only after web usage data.

## 6. Adviser partnerships and regulated advice
**Not built, hard-disabled:** `PERSONALISED_RECOMMENDATIONS`, `AUTO_REBALANCING`, `DISCRETIONARY_MANAGEMENT`, `ORDER_EXECUTION`, `CUSTODY_OF_FUNDS`, `AUTOMATED_TRADING`, `ADVISER_WORKSPACE`. They can't be approved by configuration or by a compliance reviewer (tested); enabling any of them needs a code change and authorisation.
**What a lawful adviser model would need (for counsel and the owner):**
- An operating model: WealthOS as software for SEC-registered advisers (adviser holds the licence and the client relationship) or WealthOS itself registering — capital, fit-and-proper, compliance officer, record-keeping and complaints rules apply to the latter.
- Client consent to share data with a named, verified adviser, scoped and revocable (the invitation/role model in shared spaces is a starting point but isn't an adviser workspace).
- Adviser verification (registration number check), segregation of adviser-authored recommendations from WealthOS content, suitability records, disclosures and audit trails meeting the regulator's rules.
- Partnership agreements allocating liability; professional indemnity insurance.
Until then, users can invite anyone (including their own adviser) as a viewer of a shared space; WealthOS provides no advice functionality to either side.
