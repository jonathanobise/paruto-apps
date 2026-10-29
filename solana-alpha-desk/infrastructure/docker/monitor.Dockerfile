# Solana Alpha Desk — persistent monitor (risk, execution, stops, breakers, reports).
# Build from the repository's solana-alpha-desk/ directory:
#   docker build -f infrastructure/docker/monitor.Dockerfile -t alpha-desk-monitor .
FROM node:22.22-bookworm-slim AS build
WORKDIR /src
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter @alpha-desk/monitor build

FROM node:22.22-bookworm-slim
ENV NODE_ENV=production APP_ENV=production MIGRATIONS_DIR=/app/migrations HEALTH_PORT=8788
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl tini && rm -rf /var/lib/apt/lists/* \
  && useradd --system --uid 10001 --home /app desk && mkdir -p /app/data && chown desk /app/data
COPY --from=build /src/apps/monitor/dist/monitor.mjs /app/monitor.mjs
COPY --from=build /src/infrastructure/migrations /app/migrations
USER desk
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD curl -fsS http://127.0.0.1:8788/healthz || exit 1
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "--disable-warning=ExperimentalWarning", "/app/monitor.mjs"]
