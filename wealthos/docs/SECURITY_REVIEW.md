# Security review — Milestone 4 (commercial beta)

Date: 2 Nov 2026. Scope: the whole application with focus on Milestone 4 surfaces (plans, billing, invitations, admin console, support, reports, payment notifications) and production hardening. Method: threat modelling per surface (STRIDE), code review of authorisation paths and SQL policies, adversarial integration tests, browser tests under a strict CSP. This is an internal engineering review, **not** an independent penetration test; one is required before launch.

## Findings fixed during this milestone
| # | Severity | Finding | Fix | Test |
|---|---|---|---|---|
| 1 | High | Client IP read from client-controlled `X-Forwarded-For`: rate limits (sign-in, sign-up, reset, MFA) bypassable and security logs forgeable | `clientIp()` trusts only proxy-appended entries (`TRUSTED_PROXY_HOPS`) or a platform header; production won't start without the setting | `tests/unit/client-ip.test.ts` |
| 2 | High | Org owners could insert invoices with any amount (RLS allowed owner/admin insert) and then have them "paid" | Invoices insertable only by the billing system or admins; app checks role then issues | `billing.test.ts` (tamper-proof invoices) |
| 3 | High | Customers could start a trial of any length or an unpaid subscription that carried entitlements | Trigger: one trial per organisation, catalogue price and trial length, no complimentary/active inserts, no period extension | `members-plans.test.ts` |
| 4 | High | Last owner could demote themselves: PL/pgSQL variable named `current_role` shadowed by the SQL keyword, so the check never fired | Variable renamed | `members-plans.test.ts` |
| 5 | Medium | Admin AI-flags function: `OR` outside the admin check would have returned flagged-turn metadata to non-admins | Parenthesised; admin check first | `admin-support.test.ts` |
| 6 | Medium | TOTP codes reusable within their 30-second window | Last-used step stored and advanced atomically | `identity.test.ts` |
| 7 | Medium | No Content Security Policy | Nonce + `strict-dynamic` CSP per request, `frame-ancestors 'none'`, `object-src 'none'`; HSTS over HTTPS | `e2e/security.spec.ts` (no violations) |
| 8 | Medium | Personal rows (alerts, notifications, assistant conversations, support cases) survived erasure in shared organisations; export missed several tables | Erasure and member removal delete them; export extended | `ai.test.ts`, `admin-support.test.ts` |
| 9 | Low | Support requesters could change a case's owner/organisation/status | Split policies + guard trigger | `admin-support.test.ts` |
| 10 | Low | Sign-in had no return path, so invitation links were lost | `safeNext()` allows same-site relative paths only (open-redirect safe) | `safe-next.test.ts` |
| 11 | Low | Failed assistant/billing operations left empty records | Records created only on success | `ai.test.ts` |

## Controls by surface
- **Tenancy:** RLS on every table with `org_id` (asserted by a catalogue sweep test), membership verified in Postgres, composite FKs, SECURITY DEFINER functions check the caller. Membership changes only via functions enforcing owner rules.
- **Billing:** customers can't write amounts or grant plans; invoices immutable once issued; payments must match exactly; webhook signatures timestamped (5-minute window), constant-time compared, size-limited, idempotent; unknown providers 404; the test adapter is refused in production.
- **Admin:** platform role granted only by an operator script; 2FA required in the session and re-checked by Postgres on every admin transaction; every read of a person's/organisation's details and every change audited; no access to financial records or assistant conversation content.
- **Invitations:** 32-byte random tokens stored as SHA-256, 7-day expiry, bound to the invited email, single use, revocable, rate-limited.
- **Reports:** generated on demand from the same services as the UI (RLS applies); rate-limited; audited; fixed filenames; CSV formula-injection neutralised.
- **Support:** private to the requester; staff replies emailed with a link (no content in email); messages append-only; erased with the account.
- **Headers:** CSP, HSTS (HTTPS), X-Frame-Options DENY, nosniff, strict referrer, permissions policy, COOP; request ids.
- **Supply chain:** exact-pinned dependencies; `npm audit --omit=dev` clean (0 vulnerabilities); new runtime dependency pdfkit 0.20.2 (MIT) with vendored Inter (OFL).

## Residual risks and pre-launch requirements
1. Independent penetration test and a review of this document by a security professional.
2. No email provider: invitations, billing notices and support replies only reach the dev outbox.
3. `style-src 'unsafe-inline'` (inline style attributes from charts); scripts are strict.
4. Application rate limits are fixed windows stored in Postgres (shared by all instances); add edge rate limiting and a WAF at the CDN.
5. No breached-password check (would need an external k-anonymity service — vendor decision).
6. Admin role is all-or-nothing; support/compliance roles with narrower access are designed but not built.
7. Session cookies rely on HTTPS in production (`__Host-` prefix); verify at the edge.
8. Logging/monitoring vendor not chosen; logs are structured JSON on stdout.
9. Backups/DR, key escrow and the restore drill exist only on paper (RUNBOOK.md) until infrastructure is chosen.

## Milestone 5 addendum (2 Nov 2026)
| # | Severity | Finding | Fix | Test |
|---|---|---|---|---|
| 12 | High | `regulatory_feature_approvals` had no row-level security: any runtime code path (or injected SQL) could insert an approval and switch on a pending feature in production | RLS: readable by all (gating), insertable only by compliance reviewers/admins with 2FA, under their own user id, with a reference | `staff-roles.test.ts` (raw SQL as a customer and in another reviewer's name) |
| 13 | Medium | Every page overflowed on phones (header controls ~500 px), so browsers zoomed pages out; Playwright couldn't even tap buttons | Compact header (logo mark, narrower switcher, sign-out in the menu); E2E checks every main page against the screen width | `e2e/m5.spec.ts` |

New surfaces reviewed: bank connections (scopes, consent expiry, encrypted credentials deleted on revocation, guard against re-pointing/extension/reactivation, review-before-ledger, sandbox refused in production), household ownership (members only, shares ≤ 100%, cleared on leaving), staff roles (Postgres-checked per request), service worker (caches only a static offline page — verified in the browser test).
