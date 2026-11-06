#!/bin/sh
# Build the VioWealth image from the committed code, push it to Cloudflare's registry and deploy
# the Worker in front of it (https://vio.paruto.com). Needs Docker and a Cloudflare token with
# Workers + Containers access (CLOUDFLARE_API_TOKEN, or `wrangler login`).
#
#   deploy/demo/deploy.sh             # build, push, deploy
#   deploy/demo/deploy.sh --dry-run   # build and check the Worker bundle; upload nothing
#
# Profile (PROFILE, default private; see docs/PRIVATE.md and docs/DEMO.md):
#   private  the owner only, behind Cloudflare Access. Needs OWNER_EMAIL, ACCESS_TEAM_DOMAIN
#            (https://<team>.cloudflareaccess.com) and ACCESS_AUD (the Access application's
#            audience tag). Loads official research data at build; set EODHD_API_KEY and
#            EODHD_BUDGET=<calls> to add licensed EODHD data (and BLS_API_KEY for BLS limits).
#            Keys reach the build only as Docker build secrets, never as image layers or args.
#   demo     the public SAMPLE demo.
#
# Behind a TLS-intercepting proxy, set DEMO_BUILD_CA=/path/to/ca.pem (and DEMO_BUILD_NETWORK=host).
set -eu
cd "$(dirname "$0")/../.."                                   # wealthos/
if [ -n "$(git status --porcelain -- . ':!deploy/demo/worker/node_modules')" ]; then
  echo "Commit your changes first: the image is built from what's in git." >&2; exit 1
fi
PROFILE=${PROFILE:-private}
case "$PROFILE" in
  private)
    : "${OWNER_EMAIL:?set OWNER_EMAIL (the only person allowed in)}"
    : "${ACCESS_TEAM_DOMAIN:?set ACCESS_TEAM_DOMAIN, e.g. https://<team>.cloudflareaccess.com}"
    : "${ACCESS_AUD:?set ACCESS_AUD (the Cloudflare Access application audience tag)}"
    case "$ACCESS_TEAM_DOMAIN" in https://*.cloudflareaccess.com) ;; *) echo "ACCESS_TEAM_DOMAIN must look like https://<team>.cloudflareaccess.com" >&2; exit 1;; esac ;;
  demo) ;;
  *) echo "PROFILE must be private or demo" >&2; exit 1 ;;
esac
TAG=$(git rev-parse --short=12 HEAD)
set -- "$@"
BUILD="docker build -f deploy/demo/Dockerfile -t paruto-wealth-demo:$TAG --build-arg PROFILE=$PROFILE --build-arg EODHD_BUDGET=${EODHD_BUDGET:-0}"
[ -n "${DEMO_BUILD_NETWORK:-}" ] && BUILD="$BUILD --network $DEMO_BUILD_NETWORK"
[ -n "${DEMO_BUILD_CA:-}" ] && BUILD="$BUILD --secret id=ca_bundle,src=$DEMO_BUILD_CA"
if [ "$PROFILE" = private ]; then
  [ -n "${EODHD_API_KEY:-}" ] && BUILD="$BUILD --secret id=eodhd_key,env=EODHD_API_KEY"
  [ -n "${BLS_API_KEY:-}" ] && BUILD="$BUILD --secret id=bls_key,env=BLS_API_KEY"
fi
$BUILD .

cd deploy/demo/worker
[ -d node_modules ] || npm ci --no-audit --no-fund
ACCOUNT=$(sed -n 's/.*"account_id": "\([0-9a-f]*\)".*/\1/p' wrangler.template.jsonc)
IMAGE="registry.cloudflare.com/$ACCOUNT/paruto-wealth-demo:$TAG"
if [ "$PROFILE" = private ]; then
  VARS=$(printf '"vars": { "OWNER_EMAIL": "%s", "ACCESS_TEAM_DOMAIN": "%s", "ACCESS_AUD": "%s" },' "$OWNER_EMAIL" "$ACCESS_TEAM_DOMAIN" "$ACCESS_AUD")
else
  VARS='"vars": {},'
fi
sed -e "s#IMAGE_URI#$IMAGE#" -e "s#\"VARS_PLACEHOLDER\": null,#$VARS#" wrangler.template.jsonc > wrangler.generated.jsonc
if [ "${1:-}" = "--dry-run" ]; then
  npx wrangler deploy --config wrangler.generated.jsonc --dry-run --outdir .wrangler/dry-run
  echo "Dry run ($PROFILE): image paruto-wealth-demo:$TAG built; nothing uploaded."; exit 0
fi
# Registry uploads occasionally fail mid-push ("blob unknown"); pushed layers are skipped on retry.
for attempt in 1 2 3 4; do
  npx wrangler containers push "paruto-wealth-demo:$TAG" && break
  [ "$attempt" = 4 ] && { echo "Image push failed." >&2; exit 1; }
  sleep $((attempt * 5))
done
if [ "$PROFILE" = private ] && ! npx wrangler secret list --config wrangler.generated.jsonc 2>/dev/null | grep -q '"OWNER_PROXY_SECRET"'; then
  # Created once, before the first private deploy, and kept: the Worker hands it to the container,
  # which refuses to start in the private profile without it. (Putting a secret on the existing
  # Worker keeps its current code; the new code only arrives with the deploy below.)
  node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64url'))" | npx wrangler secret put OWNER_PROXY_SECRET --config wrangler.generated.jsonc >/dev/null
  echo "Created the Worker's OWNER_PROXY_SECRET."
fi
npx wrangler deploy --config wrangler.generated.jsonc --tag "$TAG" --message "$PROFILE $TAG"
echo "Deployed $PROFILE $TAG: https://vio.paruto.com"
