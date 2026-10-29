#!/usr/bin/env bash
# One-time Cloudflare resource creation for Solana Alpha Desk. Run only after the owner approves a
# deployment. Prints the IDs to paste into the wrangler.jsonc files (database_id placeholders).
set -euo pipefail
cd "$(dirname "$0")/../.."
W="npx -y wrangler@4.141.0"
$W d1 create solana-alpha-desk
$W r2 bucket create solana-alpha-desk-evidence
$W queues create alpha-desk-candidates
$W queues create alpha-desk-candidates-dlq
echo "Now: set database_id in apps/api/wrangler.jsonc and workers/*/wrangler.jsonc, then:"
echo "  (cd apps/api && $W d1 migrations apply solana-alpha-desk --remote)"
echo "  (cd apps/api && $W secret put SETUP_TOKEN && $W secret put BRIDGE_SECRET)"
echo "  optional: SOLANA_RPC_URL, JUPITER_API_KEY, HELIUS_API_KEY as secrets on every Worker"
