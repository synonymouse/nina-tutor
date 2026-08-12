import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { getServerConfig } from './config';

let database: Database.Database | undefined;
let maintenanceTimer: ReturnType<typeof setInterval> | undefined;

const leadRetentionMs = 365 * 24 * 60 * 60 * 1000;
const rateEventRetentionMs = 10 * 60 * 1000;
const maintenanceIntervalMs = 6 * 60 * 60 * 1000;

function cleanupExpiredDataIn(openedDatabase: Database.Database, now: number): void {
  const cleanup = openedDatabase.transaction(() => {
    openedDatabase
      .prepare('DELETE FROM leads WHERE created_at < ?')
      .run(new Date(now - leadRetentionMs).toISOString());
    openedDatabase
      .prepare('DELETE FROM rate_events WHERE created_at < ?')
      .run(now - rateEventRetentionMs);
  });

  cleanup.immediate();
}

function scheduleMaintenance(): void {
  if (maintenanceTimer) return;

  maintenanceTimer = setInterval(() => {
    if (!database) return;

    try {
      cleanupExpiredDataIn(database, Date.now());
    } catch {
      console.error('Expired lead data cleanup failed');
    }
  }, maintenanceIntervalMs);
  maintenanceTimer.unref();
}

export function getDatabase(): Database.Database {
  if (database) return database;

  const path = getServerConfig().LEADS_DB_PATH;
  const directory = dirname(path);
  if (directory !== '.') mkdirSync(directory, { recursive: true });

  const openedDatabase = new Database(path);

  try {
    openedDatabase.pragma('journal_mode = WAL');
    openedDatabase.pragma('foreign_keys = ON');
    openedDatabase.pragma('busy_timeout = 5000');
    openedDatabase.exec(`
      CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        name TEXT NOT NULL,
        preferred_contact TEXT NOT NULL,
        situation TEXT NOT NULL,
        consent_version TEXT NOT NULL,
        consent_at TEXT NOT NULL,
        utm_json TEXT NOT NULL,
        notification_status TEXT NOT NULL DEFAULT 'pending'
          CHECK (notification_status IN ('pending', 'sent', 'failed'))
      );

      CREATE TABLE IF NOT EXISTS rate_events (
        ip_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS rate_events_lookup
        ON rate_events(ip_hash, created_at);
    `);
    cleanupExpiredDataIn(openedDatabase, Date.now());
  } catch (error) {
    openedDatabase.close();
    throw error;
  }

  database = openedDatabase;
  scheduleMaintenance();
  return database;
}

export function cleanupExpiredData(now = Date.now()): void {
  cleanupExpiredDataIn(getDatabase(), now);
}

export function closeDatabase(): void {
  if (maintenanceTimer) {
    clearInterval(maintenanceTimer);
    maintenanceTimer = undefined;
  }

  const openedDatabase = database;
  database = undefined;

  if (openedDatabase?.open) openedDatabase.close();
}
