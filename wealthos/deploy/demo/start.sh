#!/bin/sh
# Start the demo's private Postgres (localhost only), then the app as an unprivileged user.
# If startup fails, serve the startup log on $PORT (it holds no secrets) so it can be read from
# outside: Cloudflare doesn't surface a container's own output for an instance that exits.
LOG=/tmp/start.log
: > "$LOG"
fail() {
  echo "Demo startup failed at: $1" >> "$LOG"
  exec node -e "require('http').createServer((q,r)=>{r.writeHead(503,{'content-type':'text/plain'});r.end(require('fs').readFileSync('$LOG','utf8'))}).listen(process.env.PORT||8080,'0.0.0.0')"
}
# The runtime starts with an empty /run, so recreate Postgres's socket and lock directory.
mkdir -p /var/run/postgresql && chown postgres:postgres /var/run/postgresql && chmod 2775 /var/run/postgresql || fail "socket directory"
chmod 700 "$PGDATA" >> "$LOG" 2>&1 || fail "data directory permissions"   # COPY widens them
gosu postgres pg_ctl -D "$PGDATA" -l /tmp/pg.log -o "-c listen_addresses=127.0.0.1" -w start >> "$LOG" 2>&1 || { cat /tmp/pg.log >> "$LOG" 2>&1; fail "postgres"; }
export APP_ENCRYPTION_KEY="$(cat /app/.demo-key)"
exec gosu app node /app/node_modules/next/dist/bin/next start --hostname 0.0.0.0 --port "$PORT"
