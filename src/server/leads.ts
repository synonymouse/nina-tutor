import { randomUUID } from 'node:crypto';
import { getDatabase } from './database';
import { createLeadFingerprint } from './lead-fingerprint';
import type { LeadInput } from './lead-schema';

export type NotificationStatus = 'pending' | 'sent' | 'failed';

export interface LeadRecord {
  id: string;
  request_token: string | null;
  request_fingerprint: string | null;
  created_at: string;
  name: string;
  preferred_contact: string;
  situation: string;
  consent_version: string;
  consent_at: string;
  utm_json: string;
  notification_status: NotificationStatus;
}

export interface SavedLead {
  id: string;
  createdAt: string;
  duplicate: boolean;
}

interface LeadIdentityRow {
  id: string;
  created_at: string;
  request_fingerprint: string | null;
}

export class IdempotencyConflictError extends Error {
  constructor() {
    super('Request token is already bound to different lead content');
    this.name = 'IdempotencyConflictError';
  }
}

function findByRequestToken(
  database: ReturnType<typeof getDatabase>,
  requestToken: string,
): LeadIdentityRow | undefined {
  return database
    .prepare('SELECT id, created_at, request_fingerprint FROM leads WHERE request_token = ?')
    .get(requestToken) as LeadIdentityRow | undefined;
}

function duplicateLead(row: LeadIdentityRow, fingerprint: string): SavedLead {
  if (row.request_fingerprint !== fingerprint) throw new IdempotencyConflictError();
  return { id: row.id, createdAt: row.created_at, duplicate: true };
}

function isUniqueConstraint(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'SQLITE_CONSTRAINT_UNIQUE'
  );
}

export function getLeadByRequestToken(
  requestToken: string,
  fingerprint: string,
): SavedLead | undefined {
  const row = findByRequestToken(getDatabase(), requestToken);
  return row ? duplicateLead(row, fingerprint) : undefined;
}

export function saveLead(input: LeadInput): SavedLead {
  const database = getDatabase();
  const id = randomUUID();
  const nowMs = Date.now();
  const createdAt = new Date(nowMs).toISOString();
  const fingerprint = createLeadFingerprint(input);
  const attribution = JSON.stringify({
    source: input.utmSource,
    medium: input.utmMedium,
    campaign: input.utmCampaign,
    content: input.utmContent,
    term: input.utmTerm,
  });

  const insert = database.prepare(`
    INSERT INTO leads (
      id,
      request_token,
      request_fingerprint,
      created_at,
      name,
      preferred_contact,
      situation,
      consent_version,
      consent_at,
      utm_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertLead = database.transaction((): SavedLead => {
    if (input.requestToken) {
      const existing = findByRequestToken(database, input.requestToken);
      if (existing) return duplicateLead(existing, fingerprint);
    }

    insert.run(
      id,
      input.requestToken ?? null,
      fingerprint,
      createdAt,
      input.name,
      input.preferredContact,
      input.situation,
      input.consentVersion,
      createdAt,
      attribution,
    );
    return { id, createdAt, duplicate: false };
  });

  try {
    return insertLead.immediate();
  } catch (error) {
    if (input.requestToken && isUniqueConstraint(error)) {
      const existing = findByRequestToken(database, input.requestToken);
      if (existing) return duplicateLead(existing, fingerprint);
    }

    throw error;
  }
}

export function setNotificationStatus(id: string, status: Exclude<NotificationStatus, 'pending'>): void {
  const result = getDatabase()
    .prepare('UPDATE leads SET notification_status = ? WHERE id = ?')
    .run(status, id);
  if (result.changes !== 1) throw new Error('Lead notification status was not updated');
}

export function getLead(id: string): LeadRecord | undefined {
  return getDatabase().prepare('SELECT * FROM leads WHERE id = ?').get(id) as
    | LeadRecord
    | undefined;
}
