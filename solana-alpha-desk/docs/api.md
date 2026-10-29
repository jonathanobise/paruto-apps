# API (v1)

Base path `/api/v1`, JSON responses `{ ok: true, data }` or `{ ok: false, error }`. All endpoints except
the three `auth/status|setup|login` require the session cookie; non-GET requests also need
`x-csrf-token` (returned by login and `/auth/me`). Admin endpoints (marked †) require MFA in production.

## Auth

| Method | Path               | Body                                                            |
| ------ | ------------------ | --------------------------------------------------------------- |
| GET    | `/auth/status`     | — → `{ ownerConfigured }`                                       |
| POST   | `/auth/setup`      | `{ setupToken, email, password }` (first run only)              |
| POST   | `/auth/login`      | `{ email, password, totp? }` → sets cookie, returns `csrfToken` |
| GET    | `/auth/me`         | —                                                               |
| POST   | `/auth/logout`     | —                                                               |
| POST   | `/auth/mfa/enroll` | — → `{ secret, otpauth }`                                       |
| POST   | `/auth/mfa/verify` | `{ code }`                                                      |

## Read

`GET /overview` · `/candidates?state=&q=&minMcap=&maxMcap=&minLiq=&since=&sort=discovered|age|mcap|liquidity|volume|change|score|symbol&dir=&page=&size=` ·
`/tokens/:mint` · `/opportunities` · `/positions?status=open|closed` · `/positions/:id` · `/orders` ·
`/portfolio` · `/risk` · `/agents` · `/journal` · `/analytics?from=&to=` · `/reports` · `/reports/:id` ·
`/replay` · `/health` · `/audit?category=&before=` · `/evidence/:id` · `/settings`

## Actions

| Method | Path                                  | Body                                                                                        |
| ------ | ------------------------------------- | ------------------------------------------------------------------------------------------- |
| POST † | `/control/mode`                       | `{ mode, reason }`                                                                          |
| POST † | `/control/emergency-pause`            | `{ reason }`                                                                                |
| POST † | `/control/liquidate`                  | `{ confirm: "LIQUIDATE ALL", reason }`                                                      |
| POST † | `/control/breakers/:breaker/reset`    | `{ phrase: "RESET <BREAKER>", reason }`                                                     |
| POST † | `/control/entries/resume`             | `{ reason }`                                                                                |
| POST † | `/control/portfolio/reset`            | `{ confirm: "RESET PORTFOLIO", reason, startingEquityUsd? }`                                |
| POST † | `/opportunities/:candidateId/approve` | — (PAPER_MANUAL only; Risk still decides)                                                   |
| POST † | `/positions/:id/close`                | —                                                                                           |
| POST   | `/alerts/:id/ack`                     | —                                                                                           |
| POST   | `/reports/generate`                   | `{ kind, periodStart?, periodEnd? }`                                                        |
| POST   | `/replay/run`                         | `{ start, end, filterMode: RECORDED\|MARKET_RULES_ONLY, folds: split\|walk, walkWindows? }` |
| PUT †  | `/settings/runtime`                   | `{ timezone?, reportHourLocal?, apiDailyCallCap? }`                                         |
| PUT †  | `/settings/strategy`                  | `{ config, reason }` (validated; activates a new version)                                   |

## Internal

`POST /internal/v1/sql` — signed bridge for the monitor (headers `x-ad-timestamp`, `x-ad-nonce`,
`x-ad-signature`; see `packages/db/src/bridge.ts`).
