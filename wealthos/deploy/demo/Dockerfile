# VioWealth on vio.paruto.com: the app and its own Postgres in one container, with its data baked
# in at build time. Every container start begins from this clean state (it resets whenever it
# sleeps; see worker/src/index.ts). Not a production topology. Two profiles (--build-arg PROFILE):
#   private (default): the owner only, behind Cloudflare Access; official research data loaded at
#                      build (plus EODHD when an eodhd_key build secret is given). docs/PRIVATE.md
#   demo:              the public SAMPLE demo (docs/DEMO.md).
#
# Build context is the wealthos/ folder:  docker build -f deploy/demo/Dockerfile .
FROM node:22.23.4-bookworm-slim AS node

FROM postgres:16.15-bookworm AS base
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
 && ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx \
 && useradd --system --create-home --shell /usr/sbin/nologin app
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 PGDATA=/var/lib/demo-pg

FROM base AS build
ARG PROFILE=private
ARG EODHD_BUDGET=0
COPY package.json package-lock.json ./
# Optional: a TLS-intercepting proxy's CA for the install (passed as a build secret, never stored).
RUN --mount=type=secret,id=ca_bundle,required=false \
    if [ -f /run/secrets/ca_bundle ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca_bundle; fi; \
    npm ci --no-audit --no-fund
COPY . .
RUN npm run build
# A throwaway key for this image's own database (the demo holds no real data).
RUN node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64'))" > /app/.demo-key
# Bake the database: roles and schema, then the profile's data: official research data (private)
# or the SAMPLE catalogue with the shared demo user and portfolio (demo).
# (A spare port, so a build on a host network never meets another Postgres.)
RUN --mount=type=secret,id=ca_bundle,required=false \
    --mount=type=secret,id=eodhd_key,required=false \
    --mount=type=secret,id=bls_key,required=false \
    set -e; export PGPORT=54329; \
    case "$PROFILE" in private|demo) ;; *) echo "PROFILE must be private or demo" >&2; exit 1;; esac; \
    if [ -f /run/secrets/ca_bundle ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca_bundle; fi; \
    mkdir -p "$PGDATA" && chown postgres:postgres "$PGDATA"; \
    gosu postgres initdb -D "$PGDATA" -A trust -U postgres >/dev/null; \
    gosu postgres pg_ctl -D "$PGDATA" -o "-c listen_addresses=127.0.0.1 -p 54329" -w start >/dev/null; \
    psql -q -U postgres -h 127.0.0.1 -f scripts/sql/bootstrap-roles.sql; \
    psql -q -U postgres -h 127.0.0.1 -c "create database wealthos_demo owner wealthos_owner"; \
    psql -q -U postgres -h 127.0.0.1 -d wealthos_demo -c "create extension if not exists pgcrypto; create extension if not exists citext;"; \
    export DATABASE_OWNER_URL=postgres://wealthos_owner:x@127.0.0.1:54329/wealthos_demo \
           DATABASE_URL=postgres://wealthos_app:x@127.0.0.1:54329/wealthos_demo \
           DATABASE_APP_ROLE=wealthos_app NODE_ENV=development APP_ENV=development \
           APP_ENCRYPTION_KEY="$(cat /app/.demo-key)" \
           DEMO_PASSWORD="$(node -e "process.stdout.write(require('crypto').randomBytes(18).toString('base64url'))")"; \
    npm run -s db:migrate; \
    if [ "$PROFILE" = demo ]; then \
      npm run -s db:seed-demo -- --with-user | grep -v "^Created"; \
    else \
      if [ -f /run/secrets/bls_key ]; then export BLS_API_KEY="$(cat /run/secrets/bls_key)"; fi; \
      npm run -s ingest -- all; \
      if [ -f /run/secrets/eodhd_key ] && [ "$EODHD_BUDGET" -gt 0 ]; then \
        EODHD_API_KEY="$(cat /run/secrets/eodhd_key)" npm run -s ingest -- eodhd --budget="$EODHD_BUDGET" --fundamentals; \
      fi; \
    fi; \
    echo "$PROFILE" > /app/.profile; \
    gosu postgres pg_ctl -D "$PGDATA" -m fast -w stop >/dev/null
# The running demo needs only production dependencies and the compiled app.
RUN npm prune --omit=dev --no-audit --no-fund >/dev/null && rm -rf .next/cache

FROM base AS runtime
ENV NODE_ENV=production APP_ENV=production DEMO_MODE=1 PORT=8080 \
    DATABASE_URL=postgres://wealthos_app:x@127.0.0.1:5432/wealthos_demo \
    APP_ORIGIN=https://vio.paruto.com \
    TRUSTED_IP_HEADER=cf-connecting-ip EMAIL_TRANSPORT=outbox
COPY --from=build --chown=postgres:postgres /var/lib/demo-pg /var/lib/demo-pg
COPY --from=build --chown=app:app /app/package.json /app/next.config.ts /app/tsconfig.json /app/.demo-key /app/.profile ./
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/.next ./.next
COPY --from=build --chown=app:app /app/public ./public
COPY --from=build --chown=app:app /app/src ./src
COPY --chmod=755 deploy/demo/start.sh /usr/local/bin/start-demo
EXPOSE 8080
CMD ["start-demo"]
