# Public demo

The public SAMPLE demo (build with `PROFILE=demo deploy/demo/deploy.sh`). vio.paruto.com now runs the owner's private profile instead (docs/PRIVATE.md); this profile is kept for when a public demo is wanted again. **https://vio.paruto.com** was: a shareable, throwaway copy of the app on the SAMPLE portfolio. The old address, https://wealth-demo.paruto.com, redirects there (same path).
It is not a production deployment: no real users, no providers, no persistence.

## What visitors get
- "Explore the demo" signs them in as the shared demo user on the DEMO portfolio (synthetic SAMPLE
  prices and FX, labelled throughout). Sign-up and the password sign-in are closed.
- Everything that reads or models the portfolio works: dashboard, net worth, holdings, transactions,
  imports, goals, simulator, stress tests, target mix, explorer, watchlists, alerts, reports, Learn.
- Refused in demo mode (`src/server/demo/mode.ts`, `DEMO_MODE=1`): creating accounts, password and
  two-step changes, password reset, signing out other devices, profile and email preferences,
  invitations and member changes, shared spaces, plans and invoices, support requests, data export
  and account deletion. These could lock other visitors out, contact people or create money owed.
- Nothing identifying visitors is stored: `requestMeta()` drops IP address and user agent, and the
  security page doesn't list the shared account's sessions.
- The research assistant reports that no AI provider is connected; bank connections show "not
  connected". `APP_ENV=production` keeps features awaiting compliance review hidden.

## How it runs
- `deploy/demo/Dockerfile`: one image with the app and its own Postgres 16. The database (roles,
  migrations, SAMPLE catalogue, demo user and portfolio) is baked in at build time with a throwaway
  encryption key, so a container start takes about two seconds.
- `deploy/demo/worker`: a Cloudflare Worker (`paruto-wealth-demo`) with a Containers Durable Object.
  All visitors share one instance (`basic`: 1 GiB, ¼ vCPU) with no outbound internet access.
- **Reset:** the container sleeps after 20 idle minutes and the next visit starts a fresh copy. While
  it's awake, visitors see each other's edits (the banner says so).
- **Freshness:** SAMPLE prices run up to the image's build date; later dates show as stale, as the
  app is designed to. Redeploy to refresh.
- **Cost:** on the account's existing Workers Paid plan. Light use stays within the included
  Containers allowance; beyond it, usage is billed per second while awake.

## Deploy
From a clean checkout of the commit to publish:

    deploy/demo/deploy.sh             # build image, push to Cloudflare's registry, deploy Worker
    deploy/demo/deploy.sh --dry-run   # build and check only

It refuses to run with uncommitted changes and tags the image and Worker version with the commit.
Check it: `curl -sI https://vio.paruto.com/ | grep -i server` (`cloudflare`).
Take it down: `npx wrangler delete --name paruto-wealth-demo` (from `deploy/demo/worker`).
