#!/bin/sh
# Build the Paruto Wealth demo image from the committed code, push it to Cloudflare's registry and
# deploy the Worker in front of it (https://wealth-demo.paruto.com). Needs Docker and a Cloudflare
# token with Workers + Containers access (CLOUDFLARE_API_TOKEN, or `wrangler login`).
#
#   deploy/demo/deploy.sh             # build, push, deploy
#   deploy/demo/deploy.sh --dry-run   # build and check the Worker bundle; upload nothing
#
# Behind a TLS-intercepting proxy, set DEMO_BUILD_CA=/path/to/ca.pem (and DEMO_BUILD_NETWORK=host).
set -eu
cd "$(dirname "$0")/../.."                                   # wealthos/
if [ -n "$(git status --porcelain -- . ':!deploy/demo/worker/node_modules')" ]; then
  echo "Commit your changes first: the demo is built from what's in git." >&2; exit 1
fi
TAG=$(git rev-parse --short=12 HEAD)
set -- "$@"
BUILD="docker build -f deploy/demo/Dockerfile -t paruto-wealth-demo:$TAG"
[ -n "${DEMO_BUILD_NETWORK:-}" ] && BUILD="$BUILD --network $DEMO_BUILD_NETWORK"
[ -n "${DEMO_BUILD_CA:-}" ] && BUILD="$BUILD --secret id=ca_bundle,src=$DEMO_BUILD_CA"
$BUILD .

cd deploy/demo/worker
[ -d node_modules ] || npm ci --no-audit --no-fund
ACCOUNT=$(sed -n 's/.*"account_id": "\([0-9a-f]*\)".*/\1/p' wrangler.template.jsonc)
IMAGE="registry.cloudflare.com/$ACCOUNT/paruto-wealth-demo:$TAG"
sed "s#IMAGE_URI#$IMAGE#" wrangler.template.jsonc > wrangler.generated.jsonc
if [ "${1:-}" = "--dry-run" ]; then
  npx wrangler deploy --config wrangler.generated.jsonc --dry-run --outdir .wrangler/dry-run
  echo "Dry run: image paruto-wealth-demo:$TAG built; nothing uploaded."; exit 0
fi
npx wrangler containers push "paruto-wealth-demo:$TAG"
npx wrangler deploy --config wrangler.generated.jsonc --tag "$TAG" --message "demo $TAG"
echo "Deployed demo $TAG: https://wealth-demo.paruto.com"
