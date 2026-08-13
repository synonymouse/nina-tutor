import Database from 'better-sqlite3';
import nodemailer from 'nodemailer';

const batchSize = 20;
const defaultPendingAfterMinutes = 10;

function requiredString(name, { trim = true } = {}) {
  const raw = process.env[name];
  const value = trim ? raw?.trim() : raw;
  if (!value || /[\r\n\0]/.test(value)) throw new Error(`${name} is invalid`);
  return value;
}

function requiredEmail(name) {
  const value = requiredString(name);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error(`${name} is invalid`);
  return value;
}

function requiredPort() {
  const raw = requiredString('SMTP_PORT');
  if (!/^\d+$/.test(raw)) throw new Error('SMTP_PORT is invalid');
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('SMTP_PORT is invalid');
  }
  return port;
}

function requiredBoolean(name) {
  const value = requiredString(name).toLowerCase();
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${name} must be true or false`);
}

function optionalInteger(name, defaultValue, minimum, maximum) {
  const raw = process.env[name];
  if (raw === undefined) return defaultValue;

  const value = raw.trim();
  if (!/^\d+$/.test(value)) throw new Error(`${name} is invalid`);

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} is invalid`);
  }
  return parsed;
}

function readConfig() {
  return {
    databasePath: requiredString('LEADS_DB_PATH'),
    recipient: requiredEmail('LEAD_NOTIFICATION_EMAIL'),
    host: requiredString('SMTP_HOST'),
    port: requiredPort(),
    secure: requiredBoolean('SMTP_SECURE'),
    user: requiredString('SMTP_USER'),
    password: requiredString('SMTP_PASSWORD', { trim: false }),
    from: requiredEmail('SMTP_FROM'),
    pendingAfterMinutes: optionalInteger(
      'NOTIFICATION_PENDING_AFTER_MINUTES',
      defaultPendingAfterMinutes,
      1,
      1_440,
    ),
  };
}

async function main() {
  const config = readConfig();
  let database;
  let transport;

  try {
    database = new Database(config.databasePath, { fileMustExist: true });
    database.pragma('busy_timeout = 5000');
    const stalePendingCutoff = new Date(
      Date.now() - config.pendingAfterMinutes * 60_000,
    ).toISOString();

    const leads = database
      .prepare(`
        SELECT id, name, preferred_contact, situation, consent_version, notification_status
        FROM leads
        WHERE notification_status = 'failed'
          OR (notification_status = 'pending' AND created_at <= ?)
        ORDER BY created_at ASC, id ASC
        LIMIT ?
      `)
      .all(stalePendingCutoff, batchSize);

    if (leads.length === 0) {
      console.log('lead_notification_retry_count 0');
      return;
    }

    transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      requireTLS: !config.secure,
      tls: { minVersion: 'TLSv1.2' },
      connectionTimeout: 8_000,
      greetingTimeout: 8_000,
      socketTimeout: 15_000,
      auth: {
        user: config.user,
        pass: config.password,
      },
    });

    const markSent = database.prepare(
      "UPDATE leads SET notification_status = 'sent' WHERE id = ? AND notification_status = ?",
    );
    const markFailed = database.prepare(
      "UPDATE leads SET notification_status = 'failed' WHERE id = ? AND notification_status = 'pending'",
    );
    let sent = 0;
    let failed = 0;
    let conflicted = 0;
    let statusFailed = 0;

    for (const lead of leads) {
      try {
        await transport.sendMail({
          from: config.from,
          to: config.recipient,
          subject: `Новая заявка ${lead.id}`,
          text: [
            `ID: ${lead.id}`,
            `Имя родителя: ${lead.name}`,
            `Предпочтительный контакт: ${lead.preferred_contact}`,
            '',
            'Ситуация:',
            lead.situation,
            '',
            `Версия согласия: ${lead.consent_version}`,
          ].join('\n'),
        });
      } catch {
        failed += 1;
        console.error('lead_notification_retry_failed', lead.id);

        if (lead.notification_status === 'pending') {
          try {
            const update = markFailed.run(lead.id);
            if (update.changes !== 1) {
              conflicted += 1;
              console.error('lead_notification_retry_status_conflict', lead.id);
            }
          } catch {
            statusFailed += 1;
            console.error('lead_notification_retry_status_failed', lead.id);
          }
        }
        continue;
      }

      try {
        const update = markSent.run(lead.id, lead.notification_status);
        if (update.changes === 1) {
          sent += 1;
          console.log('lead_notification_retry_sent', lead.id);
        } else {
          conflicted += 1;
          console.error('lead_notification_retry_status_conflict', lead.id);
        }
      } catch {
        statusFailed += 1;
        console.error('lead_notification_retry_status_failed', lead.id);
      }
    }

    console.log(
      `lead_notification_retry_count ${leads.length} sent ${sent} failed ${failed} conflicted ${conflicted} status_failed ${statusFailed}`,
    );
    if (failed > 0 || conflicted > 0 || statusFailed > 0) process.exitCode = 1;
  } finally {
    transport?.close();
    database?.close();
  }
}

main().catch(() => {
  console.error('lead_notification_retry_error');
  process.exitCode = 1;
});
