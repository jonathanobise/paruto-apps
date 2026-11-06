#!/bin/sh
# Start the demo's private Postgres (localhost only), then the app as an unprivileged user.
# DIAGNOSTIC BUILD: on failure, serve the startup log on $PORT so it can be read from outside.
LOG=/tmp/start.log
fail() {
  echo "startup failed: $1" >> "$LOG"
  exec node -e "require('http').createServer((q,r)=>{r.writeHead(503,{'content-type':'text/plain'});r.end(require('fs').readFileSync('$LOG','utf8'))}).listen(process.env.PORT||8080,'0.0.0.0')"
}
{ echo "id: $(id)"; uname -a; df -h / /tmp /var/lib/demo-pg 2>&1; free -m 2>&1; ls -ld "$PGDATA" /var/run/postgresql; mount | head -5; } > "$LOG" 2>&1
chmod 700 "$PGDATA" >> "$LOG" 2>&1 || fail "chmod"
gosu postgres pg_ctl -D "$PGDATA" -l /tmp/pg.log -o "-c listen_addresses=127.0.0.1" -w start >> "$LOG" 2>&1 || { cat /tmp/pg.log >> "$LOG" 2>&1; fail "postgres"; }
export APP_ENCRYPTION_KEY="$(cat /app/.demo-key)"
exec gosu app node /app/node_modules/next/dist/bin/next start --hostname 0.0.0.0 --port "$PORT"
