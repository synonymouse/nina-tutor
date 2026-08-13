#!/usr/bin/env bash

set -euo pipefail

run_root=$(mktemp -d "${TMPDIR:-/tmp}/nina-e2e-$$.XXXXXXXX")

cleanup() {
  rm -rf -- "$run_root"
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

ln -s "$(pwd)/node_modules" "$run_root/node_modules"

export E2E_RUN_ID="${E2E_RUN_ID:-$(basename "$run_root")}"
export ASTRO_OUT_DIR="$run_root/dist"
export E2E_DIST_DIR="$ASTRO_OUT_DIR"
export E2E_DB_PATH="$run_root/leads.db"
export E2E_ARTIFACT_DIR="$run_root/test-results"

if [[ -z "${E2E_PORT:-}" ]]; then
  E2E_PORT=$(node -e "const server=require('node:net').createServer();server.listen(0,'127.0.0.1',()=>{process.stdout.write(String(server.address().port));server.close()})")
  export E2E_PORT
fi

export SITE_URL="http://127.0.0.1:${E2E_PORT}"
export PUBLIC_YANDEX_METRICA_ID=123456

printf 'E2E run root: %s\n' "$run_root"
npm run build
npx playwright test "$@"
