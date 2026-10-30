#!/usr/bin/env bash
# Deploys media.paruto.com from GitHub's master, never from this folder's working copy, so
# uncommitted files, other branches and other sessions' half-done work can't reach the site.
#   samples/deploy.sh            fetch master, stamp it, deploy it, check the live stamp
#   samples/deploy.sh --dry-run  everything except the upload
# The stamp is version.json at the site root (commit, its date, deploy time); the Cloudflare
# version gets the short commit as its tag and the commit subject as its message.
# Works with macOS's bash 3.2 and old git (no `git worktree remove`).
set -euo pipefail

SITE="https://media.paruto.com"
WRANGLER="wrangler@4.141.0"
DRY=""
case "${1:-}" in
  "") ;;
  --dry-run) DRY="--dry-run" ;;
  *) echo "usage: samples/deploy.sh [--dry-run]" >&2; exit 2 ;;
esac

cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"

# git on the Mac authenticates through gh and needs a big buffer over HTTP/1.1
GIT=(git)
if [ -x /opt/homebrew/bin/gh ]; then
  GIT=(git -c http.postBuffer=157286400 -c http.version=HTTP/1.1 -c credential.helper= -c "credential.helper=!/opt/homebrew/bin/gh auth git-credential")
fi

echo "Fetching master from GitHub…"
"${GIT[@]}" fetch --quiet origin master
COMMIT=$(git rev-parse FETCH_HEAD)
SHORT=$(git rev-parse --short FETCH_HEAD)
SUBJECT=$(git log -1 --format=%s FETCH_HEAD)
COMMITTED=$(git log -1 --format=%cI FETCH_HEAD)
echo "Deploying master at $SHORT: $SUBJECT"

TMP=$(mktemp -d "${TMPDIR:-/tmp}/media-deploy.XXXXXX")
cleanup() { rm -rf "$TMP"; git worktree prune; }
trap cleanup EXIT
git worktree add --detach "$TMP/repo" "$COMMIT" >/dev/null 2>&1

DEPLOYED=$(date -u +%Y-%m-%dT%H:%M:%SZ)
cat > "$TMP/repo/samples/version.json" <<EOF
{
  "commit": "$COMMIT",
  "short": "$SHORT",
  "subject": "$(printf '%s' "$SUBJECT" | sed 's/\\/\\\\/g; s/"/\\"/g')",
  "committed": "$COMMITTED",
  "deployed": "$DEPLOYED"
}
EOF

(cd "$TMP/repo/samples" && npx -y "$WRANGLER" deploy $DRY --tag "$SHORT" --message "master $SHORT: ${SUBJECT:0:90}")
if [ -n "$DRY" ]; then echo "Dry run: nothing uploaded."; exit 0; fi

# the live stamp should name this commit within a few seconds
for i in 1 2 3 4 5 6; do
  LIVE=$(curl -fsS "$SITE/version.json?t=$(date +%s)" 2>/dev/null | sed -n 's/.*"commit": "\([0-9a-f]*\)".*/\1/p' || true)
  if [ "$LIVE" = "$COMMIT" ]; then echo "Live: $SITE is at $SHORT ($SITE/version.json)."; exit 0; fi
  sleep 5
done
echo "Deployed, but $SITE/version.json still shows ${LIVE:-nothing} instead of $SHORT. Check again in a minute." >&2
exit 1
