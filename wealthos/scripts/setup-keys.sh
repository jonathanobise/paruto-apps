#!/bin/sh
# Save data-provider API keys to .env.local (never committed: .gitignore and .dockerignore exclude
# .env*). Run it on your own computer from the wealthos/ folder:
#
#   sh scripts/setup-keys.sh
#
# Keys are typed at hidden prompts (not echoed, not in shell history) and checked with the
# provider before saving. Press Enter to skip a key or keep the one already saved.
# In a Claude Code cloud session use the environment's Network secrets instead.
set -eu
cd "$(dirname "$0")/.."
FILE=.env.local
touch "$FILE"
chmod 600 "$FILE"

ask() { # $1 = variable name, $2 = description
  printf '%s (%s), or Enter to skip: ' "$1" "$2" >&2
  stty -echo 2>/dev/null || true
  IFS= read -r value || value=""
  stty echo 2>/dev/null || true
  printf '\n' >&2
  printf '%s' "$value" | tr -d '[:space:]'
}

save() { # $1 = name, $2 = value
  tmp=$(mktemp)
  grep -v "^$1=" "$FILE" > "$tmp" || true
  printf '%s=%s\n' "$1" "$2" >> "$tmp"
  mv "$tmp" "$FILE"
  chmod 600 "$FILE"
}

key=$(ask EODHD_API_KEY "eodhd.com → Settings → API token")
if [ -n "$key" ]; then
  plan=$(curl -s -m 20 "https://eodhd.com/api/user?api_token=$key&fmt=json" | sed -n 's/.*"subscriptionType":"\([^"]*\)".*/\1/p')
  if [ -n "$plan" ]; then save EODHD_API_KEY "$key"; echo "EODHD key saved (plan: $plan)."; else echo "EODHD did not accept that key; nothing saved." >&2; fi
fi

key=$(ask BLS_API_KEY "from the BLS registration email, after clicking its activation link")
if [ -n "$key" ]; then
  status=$(curl -s -m 20 "https://api.bls.gov/publicAPI/v2/timeseries/data/CUUR0000SA0?registrationkey=$key&latest=true" | sed -n 's/.*"status":"\([^"]*\)".*/\1/p')
  if [ "$status" = "REQUEST_SUCCEEDED" ]; then save BLS_API_KEY "$key"; echo "BLS key saved."; else echo "BLS did not accept that key (status: ${status:-no reply}). Check you clicked the activation link; nothing saved." >&2; fi
fi

echo "Done. Keys in $FILE: $(grep -cE '^(EODHD|BLS)_API_KEY=' "$FILE" || true). Next: npm run ingest -- all && npm run ingest -- eodhd --budget=20"
