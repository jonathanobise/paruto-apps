#!/bin/sh
# Start the demo's private Postgres (localhost only), then the app as an unprivileged user.
set -e
chmod 700 "$PGDATA"  # COPY widens permissions; Postgres insists on 0700
gosu postgres pg_ctl -D "$PGDATA" -o "-c listen_addresses=127.0.0.1" -w start >/dev/null
export APP_ENCRYPTION_KEY="$(cat /app/.demo-key)"
exec gosu app node /app/node_modules/next/dist/bin/next start --hostname 0.0.0.0 --port "$PORT"
