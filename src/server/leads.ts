import { randomUUID } from 'node:crypto';
import { getDatabase } from './database';
import type { LeadInput } from './lead-schema';

export type NotificationStatus = 'pending' | 'sent' | 'failed';

export interface LeadRecord {
  id: string;
  created_at: string;
  name: string;
  preferred_contact: string;
  situation: string;
  consent_version: string;
  consent_at: string;
  utm_json: string;
  notification_status: NotificationStatus;
}

const retentionMs = 365 * 24 * 60 * 60 * 1000;

export function saveLead(input: LeadInput): { id: string; createdAt: string } {
  const database = getDatabase();
  const id = randomUUID();
  const nowMs = Date.now();
  const createdAt = new Date(nowMs).toISOString();
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
      created_at,
      name,
      preferred_contact,
      situation,
      consent_version,
      consent_at,
      utm_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const deleteExpired = database.prepare('DELETE FROM leads WHERE created_at < ?');
  const persist = database.transaction(() => {
    insert.run(
      id,
      createdAt,
      input.name,
      input.preferredContact,
      input.situation,
      input.consentVersion,
      createdAt,
      attribution,
    );
    deleteExpired.run(new Date(nowMs - retentionMs).toISOString());
  });

  persist.immediate();
  return { id, createdAt };
}

export function setNotificationStatus(id: string, status: Exclude<NotificationStatus, 'pending'>): void {
  getDatabase()
    .prepare('UPDATE leads SET notification_status = ? WHERE id = ?')
    .run(status, id);
}

export function getLead(id: string): LeadRecord | undefined {
  return getDatabase().prepare('SELECT * FROM leads WHERE id = ?').get(id) as
    | LeadRecord
    | undefined;
}
