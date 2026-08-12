import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { getServerConfig } from './config';

let database: Database.Database | undefined;

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
  } catch (error) {
    openedDatabase.close();
    throw error;
  }

  database = openedDatabase;
  return database;
}

export function closeDatabase(): void {
  const openedDatabase = database;
  database = undefined;

  if (openedDatabase?.open) openedDatabase.close();
}
