import { createHmac } from 'node:crypto';
import { getServerConfig } from './config';
import { getDatabase } from './database';

const windowMs = 10 * 60 * 1000;
const maxRequests = 5;

export function hashClientIp(ip: string, now = Date.now()): string {
  const day = new Date(now).toISOString().slice(0, 10);

  return createHmac('sha256', getServerConfig().RATE_LIMIT_SECRET)
    .update(`${day}:${ip}`)
    .digest('hex');
}

export function consumeRateLimit(ip: string | null, now = Date.now()): boolean {
  if (!ip) return true;

  const database = getDatabase();
  const ipHash = hashClientIp(ip, now);
  const cutoff = now - windowMs;
  const cutoffIpHash = hashClientIp(ip, cutoff);
  const deleteExpired = database.prepare('DELETE FROM rate_events WHERE created_at < ?');
  const countEvents = database.prepare(`
    SELECT COUNT(*) AS count
    FROM rate_events
    WHERE ip_hash IN (?, ?) AND created_at >= ?
  `);
  const insertEvent = database.prepare(
    'INSERT INTO rate_events (ip_hash, created_at) VALUES (?, ?)',
  );
  const consume = database.transaction(() => {
    deleteExpired.run(cutoff);

    const { count } = countEvents.get(ipHash, cutoffIpHash, cutoff) as { count: number };
    if (count >= maxRequests) return false;

    insertEvent.run(ipHash, now);
    return true;
  });

  return consume.immediate();
}
