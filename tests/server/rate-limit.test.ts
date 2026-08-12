import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetServerConfigForTests } from '../../src/server/config';
import { closeDatabase, getDatabase } from '../../src/server/database';
import { resetTransportForTests } from '../../src/server/notify';
import { consumeRateLimit, hashClientIp } from '../../src/server/rate-limit';

let temporaryDirectory: string;

beforeEach(() => {
  closeDatabase();
  resetTransportForTests();
  resetServerConfigForTests();
  temporaryDirectory = mkdtempSync(join(tmpdir(), 'nina-rate-limit-test-'));
  process.env.LEADS_DB_PATH = join(temporaryDirectory, 'rate-limit.db');
  process.env.RATE_LIMIT_SECRET = 'f091ce6abe8c4a05849f9638df59248d';
});

afterEach(() => {
  closeDatabase();
  resetTransportForTests();
  resetServerConfigForTests();
  rmSync(temporaryDirectory, { force: true, recursive: true });
});

describe('rate limiting', () => {
  it('HMACs the address without retaining the raw IP', () => {
    const ip = '203.0.113.12';
    const hash = hashClientIp(ip, Date.parse('2026-08-13T12:00:00.000Z'));

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain(ip);
  });

  it('allows the first five requests and rejects the sixth', () => {
    const now = Date.parse('2026-08-13T12:00:00.000Z');

    for (let index = 0; index < 5; index += 1) {
      expect(consumeRateLimit('203.0.113.12', now + index)).toBe(true);
    }
    expect(consumeRateLimit('203.0.113.12', now + 5)).toBe(false);
  });

  it('keeps a rolling window across UTC midnight', () => {
    const beforeMidnight = Date.parse('2026-08-13T23:58:00.000Z');

    for (let index = 0; index < 5; index += 1) {
      expect(consumeRateLimit('2001:db8::5', beforeMidnight + index)).toBe(true);
    }
    expect(consumeRateLimit('2001:db8::5', Date.parse('2026-08-14T00:01:00.000Z'))).toBe(
      false,
    );
  });

  it('allows another request after more than ten minutes and cleans expired events', () => {
    const now = Date.parse('2026-08-13T12:00:00.000Z');

    for (let index = 0; index < 5; index += 1) {
      expect(consumeRateLimit('198.51.100.7', now + index)).toBe(true);
    }

    expect(consumeRateLimit('198.51.100.7', now + 10 * 60 * 1000 + 5)).toBe(true);
    expect(
      getDatabase().prepare('SELECT COUNT(*) AS count FROM rate_events').get(),
    ).toEqual({ count: 1 });
  });

  it('stores only address hashes and timestamps', () => {
    const ip = '192.0.2.44';
    const now = Date.parse('2026-08-13T12:00:00.000Z');

    expect(consumeRateLimit(ip, now)).toBe(true);
    const columns = (getDatabase().pragma('table_info(rate_events)') as Array<{ name: string }>).map(
      (column) => column.name,
    );
    const events = getDatabase()
      .prepare('SELECT ip_hash, created_at FROM rate_events')
      .all() as Array<{ ip_hash: string; created_at: number }>;

    expect(columns).toEqual(['ip_hash', 'created_at']);
    expect(events).toEqual([{ ip_hash: hashClientIp(ip, now), created_at: now }]);
    expect(JSON.stringify(events)).not.toContain(ip);
  });
});
