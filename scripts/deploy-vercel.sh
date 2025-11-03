#!/usr/bin/env bash
set -euo pipefail

if ! command -v vercel >/dev/null 2>&1; then
  echo "vercel CLI is required. Install via 'pnpm dlx vercel' or 'npm install -g vercel'." >&2
  exit 1
fi

: "${VERCEL_ORG_ID:?VERCEL_ORG_ID must be set}"
: "${VERCEL_PROJECT_ID:?VERCEL_PROJECT_ID must be set}"

# Allow optional commit scope override (useful for hotfix deploys)
SCOPE_FLAG=${1:-}

if [[ -n "$SCOPE_FLAG" ]]; then
  vercel deploy --prod --yes --scope "$SCOPE_FLAG"
else
  vercel deploy --prod --yes
fi
