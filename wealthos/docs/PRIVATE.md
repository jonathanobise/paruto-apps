# Private owner deployment (vio.paruto.com)

**https://vio.paruto.com** is the owner's private VioWealth: research on real data, for one person
(`OWNER_EMAIL`). It replaces the public SAMPLE demo on that host (the demo profile still exists,
docs/DEMO.md). Not the production topology (docs/DEPLOYMENT.md).

## Who gets in
Sign-in is **Paruto ID** (id.paruto.com), the shared passwordless sign-in for every Paruto app
(paruto-standards/PARUTO-ID.md; ADR-031): a passkey or a 6-digit email code there, no password here.
- `GET /api/auth/paruto/start` makes a PKCE pair and a state, keeps them in a signed, HttpOnly,
  SameSite=Lax cookie for 15 minutes, and sends the browser to Paruto ID's `/authorize`.
- `GET /api/auth/paruto/callback` checks the state (constant time), clears the cookie, exchanges the
  code server-side at `/token` with VioWealth's secret, refuses unless `email_verified`, then finds the
  account by verified email (creating it only for the owner), links the Paruto ID `sub`, and opens
  VioWealth's own session. A different `sub` for the same email is refused.
- Private mode (`PRIVATE_OWNER_EMAIL`): only the owner's email gets a session, and every page and
  action re-checks it (src/server/auth/context.ts). Sign-up, password sign-in and password reset are
  refused. Code: src/server/identity/paruto-id.ts, src/lib/private-mode.ts.
- The container has outbound internet access only so the app can reach Paruto ID's `/token`.

## Data
- Built into the image at each deploy: official sources (CBN, Federal Reserve, Bank of England,
  ONS, BLS) via `npm run ingest -- all`; EODHD (licensed for the owner's own use) when deployed
  with `EODHD_API_KEY` and `EODHD_BUDGET=<calls>`. Keys reach the build only as Docker build
  secrets. To refresh the data, redeploy.
- Nothing is saved: the container's database is rebuilt at each deploy and whenever it sleeps
  (20 idle minutes). Portfolio pages work but say so; a lasting database is a separate decision.
- Runs with `APP_ENV=staging` (features awaiting compliance review visible to the owner) and without
  `DEMO_MODE` (licensed data shown, to the owner only).

## One-time setup
1. Register the client in Paruto ID (`worker/clients.ts` in jonathanobise/paruto-id: `viowealth`,
   exact callback `https://vio.paruto.com/api/auth/paruto/callback`, `localhost:3100` for development)
   and release Paruto ID (`npm run release`). Done 8 Nov 2026 (entry committed; see ADR-031).
2. Make the secret with Paruto ID's `node scripts/client-secret.mjs --prod <private file>`, put its
   hash in `clients.ts`, then `npx wrangler secret put PARUTO_ID_SECRET --name paruto-wealth-demo <
   <private file>` and delete the file. Done 8 Nov 2026. For development the same script writes
   `PARUTO_ID_SECRET` into `wealthos/.env.local` (its hash is `devSecretHash`); set `PARUTO_ID_URL=http://localhost:5195`
   and run Paruto ID locally (`npm run dev` there, with `DEV_MODE=1` in its `.dev.vars`).
3. Deploy: `OWNER_EMAIL=… deploy/demo/deploy.sh` (PROFILE=private is the default; `PARUTO_ID_CLIENT`
   defaults to `viowealth`). The script refuses if the Worker has no `PARUTO_ID_SECRET`.

## Checks
- Signed out, every page redirects to `/sign-in`, which offers only "Continue with Paruto ID".
- Another person who signs in to Paruto ID is refused ("This account doesn't have access here")
  and gets no session.
