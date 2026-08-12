import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetServerConfigForTests } from '../../src/server/config';
import { cleanupExpiredData, closeDatabase, getDatabase } from '../../src/server/database';
import { createLeadFingerprint } from '../../src/server/lead-fingerprint';
import type { LeadInput } from '../../src/server/lead-schema';
import {
  getLead,
  getLeadByRequestToken,
  IdempotencyConflictError,
  saveLead,
  setNotificationStatus,
} from '../../src/server/leads';
import { resetTransportForTests } from '../../src/server/notify';

let temporaryDirectory: string;
let databasePath: string;
const originalLeadsDatabasePath = process.env.LEADS_DB_PATH;

function restoreLeadsDatabasePath(): void {
  if (originalLeadsDatabasePath === undefined) {
    delete process.env.LEADS_DB_PATH;
  } else {
    process.env.LEADS_DB_PATH = originalLeadsDatabasePath;
  }
}

const lead = (overrides: Partial<LeadInput> = {}): LeadInput => ({
  name: 'Анна',
  preferredContact: '@anna',
  situation: 'Ребенку сложно начинать задания самостоятельно.',
  consent: true,
  consentVersion: '1.0',
  website: '',
  utmSource: '',
  utmMedium: '',
  utmCampaign: '',
  utmContent: '',
  utmTerm: '',
  ...overrides,
});

beforeEach(() => {
  closeDatabase();
  resetTransportForTests();
  resetServerConfigForTests();
  temporaryDirectory = mkdtempSync(join(tmpdir(), 'nina-leads-test-'));
  databasePath = join(temporaryDirectory, 'leads.db');
  process.env.LEADS_DB_PATH = databasePath;
});

afterEach(() => {
  closeDatabase();
  resetTransportForTests();
  resetServerConfigForTests();
  restoreLeadsDatabasePath();
  rmSync(temporaryDirectory, { force: true, recursive: true });
});

describe('lead persistence', () => {
  it('stores consent evidence and updates notification status', () => {
    const saved = saveLead(lead());
    const stored = getLead(saved.id);

    expect(saved.duplicate).toBe(false);
    expect(stored).toMatchObject({
      id: saved.id,
      consent_version: '1.0',
      consent_at: saved.createdAt,
      notification_status: 'pending',
    });

    setNotificationStatus(saved.id, 'sent');
    expect(getLead(saved.id)?.notification_status).toBe('sent');
    setNotificationStatus(saved.id, 'failed');
    expect(getLead(saved.id)?.notification_status).toBe('failed');
  });

  it('returns the original lead for an identical request token retry', () => {
    const requestToken = '20eea3ee-971a-4d38-8072-3ad19f86c9cb';
    const input = lead({ requestToken, utmSource: 'telegram' });

    const first = saveLead(input);
    const retry = saveLead(input);

    expect(retry).toEqual({ ...first, duplicate: true });
    expect(
      getDatabase().prepare('SELECT COUNT(*) AS count FROM leads').get(),
    ).toEqual({ count: 1 });
  });

  it('rejects changed content for a previously used request token', () => {
    const requestToken = 'f8f3cff7-289a-4e36-a664-c3717e1a6908';
    const original = lead({ requestToken });
    const saved = saveLead(original);
    const originalFingerprint = createLeadFingerprint(original);

    expect(getLead(saved.id)?.request_fingerprint).toBe(originalFingerprint);
    expect(() => saveLead({ ...original, situation: 'Это уже другая ситуация ребенка.' })).toThrow(
      IdempotencyConflictError,
    );
  });

  it('migrates a legacy request-token schema and backfills its fingerprint', () => {
    const requestToken = '7e841279-50d2-4268-ae91-99ffc31c26b7';
    const legacyId = 'legacy-lead';
    const attribution = {
      source: 'telegram',
      medium: '',
      campaign: '',
      content: '',
      term: '',
    };
    const legacyDatabase = new Database(databasePath);
    legacyDatabase.exec(`
      CREATE TABLE leads (
        id TEXT PRIMARY KEY,
        request_token TEXT UNIQUE,
        created_at TEXT NOT NULL,
        name TEXT NOT NULL,
        preferred_contact TEXT NOT NULL,
        situation TEXT NOT NULL,
        consent_version TEXT NOT NULL,
        consent_at TEXT NOT NULL,
        utm_json TEXT NOT NULL,
        notification_status TEXT NOT NULL DEFAULT 'pending'
      );
    `);
    legacyDatabase
      .prepare(`
        INSERT INTO leads (
          id, request_token, created_at, name, preferred_contact, situation,
          consent_version, consent_at, utm_json, notification_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        legacyId,
        requestToken,
        new Date().toISOString(),
        'Анна',
        '@anna',
        'Ребенку сложно начинать задания самостоятельно.',
        '1.0',
        new Date().toISOString(),
        JSON.stringify(attribution),
        'pending',
      );
    legacyDatabase.close();

    const fingerprint = createLeadFingerprint(
      lead({ requestToken, utmSource: attribution.source }),
    );
    const duplicate = getLeadByRequestToken(requestToken, fingerprint);
    const columns = getDatabase().pragma('table_info(leads)') as Array<{ name: string }>;

    expect(columns.map((column) => column.name)).toContain('request_fingerprint');
    expect(getLead(legacyId)?.request_fingerprint).toBe(fingerprint);
    expect(duplicate).toMatchObject({ id: legacyId, duplicate: true });
  });

  it('removes leads older than 365 days while retaining current records', () => {
    const now = Date.parse('2026-08-13T12:00:00.000Z');
    const oldLead = saveLead(lead({ requestToken: '835a85e7-cf89-4a3f-a191-c4cdb22bbe2a' }));
    const currentLead = saveLead(lead({ requestToken: 'a7fec1de-5987-4800-ae25-8f502400df08' }));
    const updateCreatedAt = getDatabase().prepare('UPDATE leads SET created_at = ? WHERE id = ?');
    updateCreatedAt.run(new Date(now - 366 * 24 * 60 * 60 * 1000).toISOString(), oldLead.id);
    updateCreatedAt.run(new Date(now).toISOString(), currentLead.id);

    cleanupExpiredData(now);

    expect(getLead(oldLead.id)).toBeUndefined();
    expect(getLead(currentLead.id)).toBeDefined();
  });

  it('keeps metadata limited to canonical persistence fields', () => {
    const requestToken = '1154b399-76c0-4302-aa99-2439a5360128';
    const input = lead({
      requestToken,
      startedAt: 1_786_620_000_000,
      utmSource: 'newsletter',
      utmCampaign: 'august',
    });
    const saved = saveLead(input);
    const stored = getLead(saved.id);
    const columns = (getDatabase().pragma('table_info(leads)') as Array<{ name: string }>).map(
      (column) => column.name,
    );

    expect(columns).toEqual([
      'id',
      'request_token',
      'request_fingerprint',
      'created_at',
      'name',
      'preferred_contact',
      'situation',
      'consent_version',
      'consent_at',
      'utm_json',
      'notification_status',
    ]);
    expect(JSON.parse(stored?.utm_json ?? '{}')).toEqual({
      source: 'newsletter',
      medium: '',
      campaign: 'august',
      content: '',
      term: '',
    });
    expect(stored?.utm_json).not.toContain(input.preferredContact);
    expect(stored?.utm_json).not.toContain(input.situation);
    expect(stored?.utm_json).not.toContain(requestToken);
    expect(JSON.stringify(stored)).not.toContain(String(input.startedAt));
  });
});
