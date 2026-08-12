import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('E2E build lock', () => {
  it(
    'recovers stale locks, preserves new owners, and bounds live-owner waits',
    () => {
      const output = execFileSync('sh', ['tests/scripts/test-e2e-lock.sh'], {
        encoding: 'utf8',
        timeout: 20_000,
      });

      expect(output.trim().split('\n')).toEqual([
        'ok - stale empty lock recovered',
        'ok - fresh empty lock received its grace period',
        'ok - invalid PID lock recovered',
        'ok - dead PID lock recovered',
        'ok - live PID waited and acquired after release',
        'ok - permanent live PID failed within the bound',
        'ok - cleanup preserved a successor-owned lock',
      ]);
    },
    25_000,
  );
});
