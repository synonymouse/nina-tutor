#!/bin/sh

set -eu

workspace_id=$(pwd | cksum | cut -d ' ' -f 1)
lock_dir="${TMPDIR:-/tmp}/nina-e2e-${workspace_id}.lock"

while ! mkdir "$lock_dir" 2>/dev/null; do
  if [ -f "$lock_dir/pid" ]; then
    read -r lock_pid < "$lock_dir/pid"
    if ! kill -0 "$lock_pid" 2>/dev/null; then
      rm -rf "$lock_dir"
      continue
    fi
  fi
  sleep 1
done

cleanup() {
  rm -rf "$lock_dir"
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
printf '%s\n' "$$" > "$lock_dir/pid"

export E2E_RUN_ID="${E2E_RUN_ID:-$$}"
if [ -z "${E2E_PORT:-}" ]; then
  E2E_PORT=$(node -e "const server=require('node:net').createServer();server.listen(0,'127.0.0.1',()=>{process.stdout.write(String(server.address().port));server.close()})")
  export E2E_PORT
fi
export E2E_DB_PATH="${E2E_DB_PATH:-${TMPDIR:-/tmp}/nina-e2e-${E2E_RUN_ID}.db}"
export SITE_URL="http://127.0.0.1:${E2E_PORT}"
export PUBLIC_YANDEX_METRICA_ID=123456

npm run build
npx playwright test
