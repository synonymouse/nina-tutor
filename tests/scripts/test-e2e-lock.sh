#!/bin/sh

set -eu

test_dir=$(mktemp -d "${TMPDIR:-/tmp}/nina-e2e-lock-test.XXXXXX")
fake_bin="$test_dir/bin"
fake_tmp="$test_dir/tmp"
workspace_id=$(pwd | cksum | cut -d ' ' -f 1)
lock_dir="$fake_tmp/nina-e2e-${workspace_id}.lock"
mkdir "$fake_bin" "$fake_tmp"

cleanup() {
  rm -rf "$lock_dir" "$test_dir"
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

printf '%s\n' \
  '#!/bin/sh' \
  'if [ "${E2E_TEST_REPLACE_LOCK:-}" = 1 ]; then' \
  '  rm -rf "$E2E_TEST_LOCK_DIR"' \
  '  mkdir "$E2E_TEST_LOCK_DIR"' \
  '  printf "%s\n" "$E2E_TEST_SUCCESSOR_PID" > "$E2E_TEST_LOCK_DIR/pid"' \
  'fi' \
  'exit 0' > "$fake_bin/npm"
printf '%s\n' '#!/bin/sh' 'exit 0' > "$fake_bin/npx"
chmod +x "$fake_bin/npm" "$fake_bin/npx"

run_wrapper() {
  PATH="$fake_bin:$PATH" \
    TMPDIR="$fake_tmp" \
    E2E_LOCK_TIMEOUT_SECONDS="${E2E_LOCK_TIMEOUT_SECONDS:-5}" \
    E2E_LOCK_GRACE_SECONDS="${E2E_LOCK_GRACE_SECONDS:-1}" \
    E2E_LOCK_POLL_SECONDS="${E2E_LOCK_POLL_SECONDS:-1}" \
    sh scripts/test-e2e.sh
}

assert_lock_removed() {
  if [ -e "$lock_dir" ]; then
    printf '%s\n' "Expected lock to be removed: $lock_dir" >&2
    exit 1
  fi
}

mkdir "$lock_dir"
sleep 2
run_wrapper
assert_lock_removed
printf '%s\n' 'ok - stale empty lock recovered'

mkdir "$lock_dir"
sh -c '
  sleep 1
  pid_file_tmp="$1/pid.$$"
  printf "%s\n" "$$" > "$pid_file_tmp"
  mv "$pid_file_tmp" "$1/pid"
  sleep 1
  rm -rf "$1"
' sh "$lock_dir" &
empty_lock_owner=$!
E2E_LOCK_GRACE_SECONDS=3 run_wrapper
wait "$empty_lock_owner" 2>/dev/null || true
assert_lock_removed
printf '%s\n' 'ok - fresh empty lock received its grace period'

mkdir "$lock_dir"
printf '%s\n' 'not-a-pid' > "$lock_dir/pid"
run_wrapper
assert_lock_removed
printf '%s\n' 'ok - invalid PID lock recovered'

sleep 0 &
dead_pid=$!
wait "$dead_pid"
mkdir "$lock_dir"
printf '%s\n' "$dead_pid" > "$lock_dir/pid"
run_wrapper
assert_lock_removed
printf '%s\n' 'ok - dead PID lock recovered'

sh -c 'sleep 2; rm -rf "$1"' sh "$lock_dir" &
live_pid=$!
mkdir "$lock_dir"
printf '%s\n' "$live_pid" > "$lock_dir/pid"
started_at=$(date +%s)
run_wrapper
elapsed=$(( $(date +%s) - started_at ))
wait "$live_pid" 2>/dev/null || true
if [ "$elapsed" -lt 1 ]; then
  printf '%s\n' 'Wrapper did not wait for the live lock owner' >&2
  exit 1
fi
assert_lock_removed
printf '%s\n' 'ok - live PID waited and acquired after release'

mkdir "$lock_dir"
printf '%s\n' "$$" > "$lock_dir/pid"
timeout_output="$test_dir/timeout.err"
if E2E_LOCK_TIMEOUT_SECONDS=2 run_wrapper 2> "$timeout_output"; then
  printf '%s\n' 'Expected a permanent live lock to time out' >&2
  exit 1
fi
timeout_message=
IFS= read -r timeout_message < "$timeout_output" || true
case $timeout_message in
  *'Timed out after 2 seconds waiting for E2E build lock'*) ;;
  *)
    printf '%s\n' 'Expected a clear lock timeout error' >&2
    exit 1
    ;;
esac
rm -rf "$lock_dir"
printf '%s\n' 'ok - permanent live PID failed within the bound'

E2E_TEST_REPLACE_LOCK=1 \
  E2E_TEST_LOCK_DIR="$lock_dir" \
  E2E_TEST_SUCCESSOR_PID="$$" \
  run_wrapper
successor_pid=
IFS= read -r successor_pid < "$lock_dir/pid"
if [ "$successor_pid" != "$$" ]; then
  printf '%s\n' 'Wrapper cleanup removed or changed a successor-owned lock' >&2
  exit 1
fi
rm -rf "$lock_dir"
printf '%s\n' 'ok - cleanup preserved a successor-owned lock'
