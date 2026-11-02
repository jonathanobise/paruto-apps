# Security

Guided by OWASP ASVS 4 (Level 2 target). Status per control:

| Area | Implemented | Planned / gaps |
|---|---|---|
| Authentication | scrypt (N=2^17, r=8, p=1; self-describing, rehash on login), 12+ char passwords with common/repetition checks, generic errors, timing equalisation for unknown users, lockout after 5 failures (15 min), per-IP and per-email rate limits (Postgres buckets) | Breached-password check (k-anonymity), passkeys/WebAuthn |
| Sessions | 256-bit random token in httpOnly, SameSite=Lax, `__Host-`/Secure cookie in production; only SHA-256 stored; 60-min idle + 12-h absolute expiry; device list with revoke; all sessions revoked on password reset/change and MFA enable | Re-auth for sensitive actions beyond password prompts |
| MFA | TOTP (RFC 6238, ±1 step), secret AES-256-GCM encrypted at rest, QR rendered server-side, 10 single-use hashed recovery codes, sessions gated until MFA satisfied | Replay protection of a used TOTP step; enforce MFA for staff roles |
| Email verification & reset | Single-use hashed tokens (24 h / 1 h), no account enumeration, security notices on duplicate sign-up, MFA changes | Real email provider (none connected) |
| Authorisation | Platform administrators: role granted only by an operator script, two-step verification required (session and account), re-checked in Postgres by `app_is_platform_admin()` on every catalogue write; all admin actions audited. Global reference tables (instruments, prices, rates, FX, sources, institutions, identifiers) are read-only to everyone else at the database. Services authorise every call; tenant ids derived from session + membership, never from the client; Postgres RLS on all tenant tables keyed on verified membership; viewer role read-only in RLS; composite FKs prevent cross-tenant references; SECURITY DEFINER functions check the caller | Support/compliance roles and their audited access path (M4); four-eyes approval for catalogue changes |
| Data integrity | Append-only ledger and logs via triggers + missing grants; reversals instead of edits; per-org advisory lock on ledger writes; idempotency keys | — |
| Input/output | Zod validation on every service input; React output encoding; CSV export neutralises formula injection; no `dangerouslySetInnerHTML` except server-generated QR SVG | CSP with nonces (M4) |
| Transport/headers | nosniff, frame DENY, strict referrer, permissions policy, COOP; `poweredByHeader` off | HSTS at the edge; CSP |
| Secrets | `.env.local` (git-ignored); env validated at boot; no secrets in repo | Managed secret store; key rotation for APP_ENCRYPTION_KEY (versioned ciphertexts) |
| Privacy | Consent records (append-only, versioned), JSON export of all user data, erasure via SECURITY DEFINER function (deletes solely-owned orgs, the user's personal rows — alerts, notifications, assistant conversations — in shared orgs, anonymises the user, keeps opaque ids in logs), no bank/broker credentials stored, masked numbers ≤ 4 chars | DPIA; retention schedule; DSAR workflow tooling |
| Alerts | Alerts and notifications are private to their owner even within a shared organisation (RLS on user and org); the scheduler sees only (org, user) pairs via a SECURITY DEFINER function; the job queue is a system table with no user-facing reads | — |
| AI assistant | Read-only tools under the caller's RLS context; personal tools only with explicit consent; strict schemas and id validation; tool output treated as data; identifiers redacted before sending and storing; tool results never stored; conversations private to the user, exported and erased with the account; per-user and per-organisation limits; every turn audited (docs/AI_SAFETY.md) | Vendor DPA and retention settings; admin review queue for flagged conversations |
| Audit | `audit_events` (tenant actions), `security_events` (auth) — both append-only | Admin audit viewer, alerting |
| Supply chain | Exact-pinned dependencies; `npm audit --omit=dev` clean at commit time | Dependabot/Renovate, SBOM, CI scanning |
| Files | CSV imports only: 2 MiB / 5,000 rows / 50 columns / 500-char cells, strict UTF-8, binary (NUL) rejection, rate-limited, nothing executed; raw text deleted after commit/discard; formula neutralisation on export (docs/IMPORTS.md) | Malware scanning if other file types are ever accepted |

## Adversarial tests (`tests/integration/tenancy.test.ts`)
Forged org context, cross-tenant import read/commit/rollback, illegal import status transitions, raw SQL inserts into another org, cross-tenant FK, ledger tampering (UPDATE/DELETE), self-adding to another org's memberships, calling SECURITY DEFINER functions for another user, runtime role attempting `ALTER TABLE … DISABLE ROW LEVEL SECURITY` and `SET ROLE` to the owner, viewer write attempts, export scoping, and a catalogue sweep asserting every table with an `org_id` column has RLS enabled. AI-specific adversarial tests (cross-tenant conversation read/continue/insert, injected instructions in ledger text, tools requested without consent) are in `tests/integration/ai.test.ts`. Plus identity tests (enumeration, lockout, token single use, MFA) and E2E checks that APIs reject unauthenticated access.

## Known dev-dependency advisories
`npm audit` reports moderate `minimatch` ReDoS advisories inside the ESLint toolchain (dev only, not shipped). Production dependency audit is clean.

## Reporting
Security contact and disclosure policy to be published before launch.
