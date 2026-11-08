# Private owner deployment (vio.paruto.com)

**https://vio.paruto.com** is the owner's private VioWealth: research on real data, reachable by one
person (`OWNER_EMAIL`). It replaces the public SAMPLE demo on that host (the demo profile still
exists, docs/DEMO.md). Not the production topology (docs/DEPLOYMENT.md).

## How access is controlled (three layers, each fails closed)
1. **Cloudflare Access** in front of the hostname: a self-hosted Access application for
   `vio.paruto.com` whose only policy allows the owner's email, signed in with Cloudflare's
   one-time code sent to that mailbox. Nobody else reaches the Worker.
2. **The Worker** (`deploy/demo/worker/src/index.ts`, `access.ts`) re-verifies the Access token on
   every request: RS256 signature against the team's published keys, audience (`ACCESS_AUD`),
   issuer (`ACCESS_TEAM_DOMAIN`), expiry, and that the email is `OWNER_EMAIL`. It strips any
   owner headers a visitor sends, then adds the verified email and `OWNER_PROXY_SECRET`. Missing
   configuration → 403.
3. **The app** (`src/lib/private-mode.ts`, `src/proxy.ts`) refuses every request without the
   Worker's secret and the owner's email (constant-time comparison), and has no other way in:
   sign-up, password sign-in and password reset are refused; the owner is signed in by
   `/private/enter`, which creates the owner's account on first visit (random, unknown password).
   The container also refuses to start in the private profile without the owner settings.

## Data
- Built into the image at each deploy: official sources (CBN, Federal Reserve, Bank of England,
  ONS, BLS) via `npm run ingest -- all`; EODHD (licensed for the owner's own use) when deployed
  with `EODHD_API_KEY` and `EODHD_BUDGET=<calls>` (also fetches fundamentals). Keys reach the
  build only as Docker build secrets. To refresh the data, redeploy.
- Nothing is saved: the container's database is rebuilt at each deploy and whenever it sleeps
  (20 idle minutes). Portfolio pages work but say so; a lasting database is a separate decision.
- Runs with `APP_ENV=staging`, so features awaiting compliance review are visible to the owner,
  and without `DEMO_MODE`, so licensed data is shown (to the owner only).

## One-time setup
1. The owner turns on Cloudflare Zero Trust (dashboard → Zero Trust; choose a team name; Free
   plan). The team domain is `https://<team>.cloudflareaccess.com`.
2. Enable the **One-time PIN** login method, then create a **self-hosted application** for
   `vio.paruto.com` with one Allow policy: *Emails* = the owner's address. Note its
   **Application Audience (AUD) tag**. (Done through the Cloudflare API from a session that has
   Access permissions, or in the dashboard.)
3. Deploy:

```bash
OWNER_EMAIL=… ACCESS_TEAM_DOMAIN=https://<team>.cloudflareaccess.com ACCESS_AUD=… \
  deploy/demo/deploy.sh            # PROFILE=private is the default
```

The first private deploy creates the Worker secret `OWNER_PROXY_SECRET` (kept afterwards).

## Checks
- Signed out: `curl -sI https://vio.paruto.com/` redirects to `<team>.cloudflareaccess.com` (Access).
- Bypassing Access is not possible from outside (the hostname is Access-protected), and a request
  reaching the Worker without a valid token gets 403.
