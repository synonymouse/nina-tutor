import Database from 'better-sqlite3';
import nodemailer from 'nodemailer';

const batchSize = 20;

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
  };
}

async function main() {
  const config = readConfig();
  let database;
  let transport;

  try {
    database = new Database(config.databasePath, { fileMustExist: true });
    database.pragma('busy_timeout = 5000');

    const leads = database
      .prepare(`
        SELECT id, name, preferred_contact, situation, consent_version
        FROM leads
        WHERE notification_status = 'failed'
        ORDER BY created_at ASC, id ASC
        LIMIT ?
      `)
      .all(batchSize);

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
      "UPDATE leads SET notification_status = 'sent' WHERE id = ? AND notification_status = 'failed'",
    );
    let sent = 0;
    let failed = 0;
    let conflicted = 0;

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

        const update = markSent.run(lead.id);
        if (update.changes === 1) {
          sent += 1;
          console.log('lead_notification_retry_sent', lead.id);
        } else {
          conflicted += 1;
          console.error('lead_notification_retry_status_conflict', lead.id);
        }
      } catch {
        failed += 1;
        console.error('lead_notification_retry_failed', lead.id);
      }
    }

    console.log(
      `lead_notification_retry_count ${leads.length} sent ${sent} failed ${failed} conflicted ${conflicted}`,
    );
    if (failed > 0 || conflicted > 0) process.exitCode = 1;
  } finally {
    transport?.close();
    database?.close();
  }
}

main().catch(() => {
  console.error('lead_notification_retry_error');
  process.exitCode = 1;
});
