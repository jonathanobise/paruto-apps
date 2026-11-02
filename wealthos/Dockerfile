# WealthOS container image (app, worker and migrations share it). Not deployed yet: see
# docs/DEPLOYMENT.md and docs/RUNBOOK.md. The build needs no secrets; everything is runtime env.
#
#   docker build -t wealthos .
#   docker run --env-file prod.env -p 3100:3100 wealthos                      # web app
#   docker run --env-file prod.env wealthos npm run worker                    # background worker
#   docker run --env-file migrate.env wealthos npm run db:migrate             # owner-role migrations
FROM node:22.23.4-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22.23.4-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3100
# The worker and migration scripts run TypeScript through tsx, so dev dependencies stay installed.
COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/src ./src
COPY --from=build --chown=node:node /app/scripts ./scripts
COPY --from=build --chown=node:node /app/drizzle ./drizzle
COPY --from=build --chown=node:node /app/next.config.ts /app/tsconfig.json ./
USER node
EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD node -e "fetch('http://127.0.0.1:3100/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["npx", "next", "start", "--port", "3100"]
