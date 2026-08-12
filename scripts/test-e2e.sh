#!/bin/sh

set -eu

workspace_id=$(pwd | cksum | cut -d ' ' -f 1)
lock_dir="${TMPDIR:-/tmp}/nina-e2e-${workspace_id}.lock"
lock_timeout_seconds=${E2E_LOCK_TIMEOUT_SECONDS:-120}
lock_grace_seconds=${E2E_LOCK_GRACE_SECONDS:-5}
lock_poll_seconds=${E2E_LOCK_POLL_SECONDS:-1}

case $lock_timeout_seconds in
  ''|*[!0-9]*|0)
    printf '%s\n' 'E2E_LOCK_TIMEOUT_SECONDS must be a positive integer' >&2
    exit 2
    ;;
esac
case $lock_grace_seconds in
  ''|*[!0-9]*)
    printf '%s\n' 'E2E_LOCK_GRACE_SECONDS must be a non-negative integer' >&2
    exit 2
    ;;
esac
case $lock_poll_seconds in
  ''|*[!0-9]*|0)
    printf '%s\n' 'E2E_LOCK_POLL_SECONDS must be a positive integer' >&2
    exit 2
    ;;
esac

lock_started_at=$(date +%s)

lock_mtime() {
  if stat_value=$(stat -f '%m' "$lock_dir" 2>/dev/null); then
    case $stat_value in
      ''|*[!0-9]*) ;;
      *)
        printf '%s\n' "$stat_value"
        return 0
        ;;
    esac
  fi
  if stat_value=$(stat -c '%Y' "$lock_dir" 2>/dev/null); then
    case $stat_value in
      ''|*[!0-9]*) ;;
      *)
        printf '%s\n' "$stat_value"
        return 0
        ;;
    esac
  fi
  return 1
}

remove_stale_lock() {
  stale_lock="${lock_dir}.stale.$$"
  if mv "$lock_dir" "$stale_lock" 2>/dev/null; then
    rm -rf "$stale_lock"
  fi
}

cleanup() {
  lock_pid=
  if [ -f "$lock_dir/pid" ]; then
    read -r lock_pid < "$lock_dir/pid" || lock_pid=
  fi
  if [ "$lock_pid" = "$$" ] || [ -f "$lock_dir/pid.$$" ]; then
    released_lock="${lock_dir}.released.$$"
    if mv "$lock_dir" "$released_lock" 2>/dev/null; then
      rm -rf "$released_lock"
    fi
  fi
}

while :; do
  if mkdir "$lock_dir" 2>/dev/null; then
    # Publish ownership before any build command can fail.
    trap cleanup EXIT
    trap 'exit 130' INT
    trap 'exit 143' TERM
    pid_file_tmp="$lock_dir/pid.$$"
    printf '%s\n' "$$" > "$pid_file_tmp"
    mv "$pid_file_tmp" "$lock_dir/pid"
    break
  fi

  now=$(date +%s)
  elapsed=$((now - lock_started_at))
  if [ "$elapsed" -ge "$lock_timeout_seconds" ]; then
    printf '%s\n' \
      "Timed out after ${lock_timeout_seconds} seconds waiting for E2E build lock: $lock_dir" >&2
    exit 1
  fi

  lock_pid=
  if [ -f "$lock_dir/pid" ]; then
    read -r lock_pid < "$lock_dir/pid" || lock_pid=
    case $lock_pid in
      ''|*[!0-9]*)
        remove_stale_lock
        continue
        ;;
    esac
    if [ "$lock_pid" -le 0 ] 2>/dev/null || ! kill -0 "$lock_pid" 2>/dev/null; then
      remove_stale_lock
      continue
    fi
  elif modified_at=$(lock_mtime); then
    lock_age=$((now - modified_at))
    if [ "$lock_age" -ge "$lock_grace_seconds" ]; then
      remove_stale_lock
      continue
    fi
  fi

  sleep "$lock_poll_seconds"
done

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
