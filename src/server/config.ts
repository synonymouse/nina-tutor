import { z } from 'zod';

const booleanString = z.preprocess((value) => {
  if (value === undefined) return true;
  if (typeof value === 'boolean') return value;

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }

  return value;
}, z.boolean());

const serverConfigSchema = z.object({
  LEADS_DB_PATH: z.string().trim().min(1).default('./var/leads.db'),
  LEAD_NOTIFICATION_EMAIL: z.email(),
  SMTP_HOST: z.string().trim().min(1),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_SECURE: booleanString,
  SMTP_USER: z.string().trim().min(1),
  SMTP_PASSWORD: z.string().min(1),
  SMTP_FROM: z.email(),
  RATE_LIMIT_SECRET: z
    .string()
    .trim()
    .min(32)
    .refine((value) => !value.toLowerCase().startsWith('replace-with'), {
      message: 'RATE_LIMIT_SECRET must not be a documentation placeholder',
    }),
});

export type ServerConfig = z.infer<typeof serverConfigSchema>;

let cachedConfig: ServerConfig | undefined;

export function getServerConfig(): ServerConfig {
  cachedConfig ??= serverConfigSchema.parse(process.env);
  return cachedConfig;
}

export function resetServerConfigForTests(): void {
  cachedConfig = undefined;
}
