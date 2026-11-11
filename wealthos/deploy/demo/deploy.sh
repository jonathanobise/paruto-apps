#!/bin/sh
# Build the VioWealth image from the committed code, push it to Cloudflare's registry and deploy
# the Worker in front of it (https://vio.paruto.com). Needs Docker and a Cloudflare token with
# Workers + Containers access (CLOUDFLARE_API_TOKEN, or `wrangler login`).
#
#   deploy/demo/deploy.sh             # build, push, deploy
#   deploy/demo/deploy.sh --dry-run   # build and check the Worker bundle; upload nothing
#
# Releases go through `npm run release` (scripts/release.mjs), which numbers and tags the commit
# (viowealth-vX.Y.Z) and then runs this; the tag gives the build its number (shown in the app).
#
# Profile (PROFILE, default private; see docs/PRIVATE.md and docs/DEMO.md):
#   private  the owner only, signing in through Paruto ID. Needs OWNER_EMAIL; PARUTO_ID_CLIENT
#            defaults to viowealth and PARUTO_ID_URL to https://id.paruto.com. The Worker must
#            already hold the PARUTO_ID_SECRET secret (docs/PRIVATE.md, "One-time setup").
#            Loads official research data at build; set EODHD_API_KEY and
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
    PARUTO_ID_URL=${PARUTO_ID_URL:-https://id.paruto.com}
    PARUTO_ID_CLIENT=${PARUTO_ID_CLIENT:-viowealth} ;;
  demo) ;;
  *) echo "PROFILE must be private or demo" >&2; exit 1 ;;
esac
TAG=$(git rev-parse --short=12 HEAD)
set -- "$@"
# The release this commit is (its viowealth-vX.Y.Z tag, made by `npm run release`), and every earlier
# one, so the app shows its number and its timeline. An untagged commit builds without a number.
RELEASE=$(git tag --points-at HEAD -l 'viowealth-v*' | sed -n 's/^viowealth-v\([0-9]*\.[0-9]*\.[0-9]*\)$/\1/p' | sort -t. -k1,1n -k2,2n -k3,3n | tail -1)
RELEASE_AT=""
[ -n "$RELEASE" ] && RELEASE_AT=$(git for-each-ref --format='%(creatordate:iso-strict)' "refs/tags/viowealth-v$RELEASE")
RELEASES=$(git for-each-ref --format='%(refname:short) %(creatordate:iso-strict)' 'refs/tags/viowealth-v*' | sed -n 's/^viowealth-v\([0-9]*\.[0-9]*\.[0-9]*\) \(.*\)$/["\1","\2"]/p' | paste -sd, -)
RELEASES="[${RELEASES}]"
echo "Building ${RELEASE:+VioWealth v$RELEASE }($PROFILE, $TAG)"
BUILD="docker build -f deploy/demo/Dockerfile -t paruto-wealth-demo:$TAG --build-arg PROFILE=$PROFILE --build-arg EODHD_BUDGET=${EODHD_BUDGET:-0}"
BUILD="$BUILD --build-arg VIO_BUILD=$TAG --build-arg VIO_RELEASE=$RELEASE --build-arg VIO_RELEASE_AT=$RELEASE_AT --build-arg VIO_RELEASES=$RELEASES"
[ -n "${DEMO_BUILD_NETWORK:-}" ] && BUILD="$BUILD --network $DEMO_BUILD_NETWORK"
[ -n "${DEMO_BUILD_CA:-}" ] && BUILD="$BUILD --secret id=ca_bundle,src=$DEMO_BUILD_CA"
if [ "$PROFILE" = private ]; then
  [ -n "${EODHD_API_KEY:-}" ] && BUILD="$BUILD --secret id=eodhd_key,env=EODHD_API_KEY"
  [ -n "${BLS_API_KEY:-}" ] && BUILD="$BUILD --secret id=bls_key,env=BLS_API_KEY"
fi
$BUILD .
# A data source that failed at build is left out rather than blocking the deploy; say which.
GAPS=$(docker run --rm --entrypoint cat "paruto-wealth-demo:$TAG" /app/.data-gaps 2>/dev/null | paste -sd, - | sed 's/,/, /g')

cd deploy/demo/worker
[ -d node_modules ] || npm ci --no-audit --no-fund
ACCOUNT=$(sed -n 's/.*"account_id": "\([0-9a-f]*\)".*/\1/p' wrangler.template.jsonc)
IMAGE="registry.cloudflare.com/$ACCOUNT/paruto-wealth-demo:$TAG"
if [ "$PROFILE" = private ]; then
  VARS=$(printf '"vars": { "OWNER_EMAIL": "%s", "PARUTO_ID_URL": "%s", "PARUTO_ID_CLIENT": "%s" },' "$OWNER_EMAIL" "$PARUTO_ID_URL" "$PARUTO_ID_CLIENT")
else
  VARS='"vars": {},'
fi
sed -e "s#IMAGE_URI#$IMAGE#" -e "s#\"VARS_PLACEHOLDER\": null,#$VARS#" wrangler.template.jsonc > wrangler.generated.jsonc
if [ "${1:-}" = "--dry-run" ]; then
  npx wrangler deploy --config wrangler.generated.jsonc --dry-run --outdir .wrangler/dry-run
  echo "Dry run ($PROFILE): image paruto-wealth-demo:$TAG built; nothing uploaded.${GAPS:+ Not loaded: $GAPS.}"; exit 0
fi
# Registry uploads occasionally fail mid-push ("blob unknown"); pushed layers are skipped on retry.
for attempt in 1 2 3 4; do
  npx wrangler containers push "paruto-wealth-demo:$TAG" && break
  [ "$attempt" = 4 ] && { echo "Image push failed." >&2; exit 1; }
  sleep $((attempt * 5))
done
if [ "$PROFILE" = private ] && ! npx wrangler secret list --config wrangler.generated.jsonc 2>/dev/null | grep -q '"PARUTO_ID_SECRET"'; then
  # The app can't sign anyone in without it, and the container refuses to start without it.
  echo "The Worker has no PARUTO_ID_SECRET yet: make one with Paruto ID's client-secret script and put it (docs/PRIVATE.md)." >&2; exit 1
fi
LABEL=${RELEASE:+v$RELEASE}
npx wrangler deploy --config wrangler.generated.jsonc --tag "${LABEL:-$TAG}" --message "${RELEASE:+VioWealth v$RELEASE · }$PROFILE $TAG"
echo "Deployed ${RELEASE:+VioWealth v$RELEASE, }$PROFILE $TAG: https://vio.paruto.com (live: curl -s https://vio.paruto.com/__version)"
[ -n "$GAPS" ] && echo "! Not loaded at this build (left out; redeploy to retry): $GAPS"
exit 0
