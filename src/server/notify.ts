import nodemailer, { type Transporter } from 'nodemailer';
import { getServerConfig } from './config';
import type { LeadInput } from './lead-schema';

let transport: Transporter | undefined;

function getTransport(): Transporter {
  if (transport) return transport;

  const config = getServerConfig();
  transport = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_SECURE,
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASSWORD,
    },
  });

  return transport;
}

export async function notifyLead(id: string, input: LeadInput): Promise<void> {
  const config = getServerConfig();

  await getTransport().sendMail({
    from: config.SMTP_FROM,
    to: config.LEAD_NOTIFICATION_EMAIL,
    subject: `Новая заявка ${id}`,
    text: [
      `ID: ${id}`,
      `Имя родителя: ${input.name}`,
      `Предпочтительный контакт: ${input.preferredContact}`,
      '',
      'Ситуация:',
      input.situation,
      '',
      `Версия согласия: ${input.consentVersion}`,
    ].join('\n'),
  });
}

export function resetTransportForTests(): void {
  transport?.close();
  transport = undefined;
}
