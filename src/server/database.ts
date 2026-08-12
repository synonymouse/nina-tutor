import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { getServerConfig } from './config';
import { createLeadFingerprint } from './lead-fingerprint';

let database: Database.Database | undefined;
let maintenanceTimer: ReturnType<typeof setInterval> | undefined;

const leadRetentionMs = 365 * 24 * 60 * 60 * 1000;
const rateEventRetentionMs = 10 * 60 * 1000;
const maintenanceIntervalMs = 6 * 60 * 60 * 1000;

interface TableInfoRow {
  name: string;
}

interface FingerprintMigrationRow {
  id: string;
  name: string;
  preferred_contact: string;
  situation: string;
  consent_version: string;
  utm_json: string;
}

function parseStoredAttribution(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function storedUtm(attribution: Record<string, unknown>, key: string): string {
  const value = attribution[key];
  return typeof value === 'string' ? value : '';
}

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
    const initializeSchema = openedDatabase.transaction(() => {
      openedDatabase.exec(`
        CREATE TABLE IF NOT EXISTS leads (
          id TEXT PRIMARY KEY,
          request_token TEXT UNIQUE,
          request_fingerprint TEXT,
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
      `);

      const leadColumns = openedDatabase.pragma('table_info(leads)') as TableInfoRow[];
      if (!leadColumns.some((column) => column.name === 'request_token')) {
        openedDatabase.exec('ALTER TABLE leads ADD COLUMN request_token TEXT');
      }
      if (!leadColumns.some((column) => column.name === 'request_fingerprint')) {
        openedDatabase.exec('ALTER TABLE leads ADD COLUMN request_fingerprint TEXT');
      }

      const rowsToBackfill = openedDatabase
        .prepare(`
          SELECT id, name, preferred_contact, situation, consent_version, utm_json
          FROM leads
          WHERE request_token IS NOT NULL AND request_fingerprint IS NULL
        `)
        .all() as FingerprintMigrationRow[];
      const updateFingerprint = openedDatabase.prepare(
        'UPDATE leads SET request_fingerprint = ? WHERE id = ?',
      );

      for (const row of rowsToBackfill) {
        const attribution = parseStoredAttribution(row.utm_json);
        const fingerprint = createLeadFingerprint({
          name: row.name,
          preferredContact: row.preferred_contact,
          situation: row.situation,
          consentVersion: row.consent_version,
          utmSource: storedUtm(attribution, 'source'),
          utmMedium: storedUtm(attribution, 'medium'),
          utmCampaign: storedUtm(attribution, 'campaign'),
          utmContent: storedUtm(attribution, 'content'),
          utmTerm: storedUtm(attribution, 'term'),
        });
        updateFingerprint.run(fingerprint, row.id);
      }

      openedDatabase.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS leads_request_token_unique
          ON leads(request_token) WHERE request_token IS NOT NULL;
        CREATE INDEX IF NOT EXISTS rate_events_lookup
          ON rate_events(ip_hash, created_at);
      `);
    });

    initializeSchema.immediate();
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
