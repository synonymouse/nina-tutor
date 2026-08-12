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

const siteOrigin = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() : value),
  z
    .url()
    .refine((value) => ['http:', 'https:'].includes(new URL(value).protocol), {
      message: 'SITE_URL must use http or https',
    })
    .transform((value) => new URL(value).origin),
);

const serverConfigSchema = z.object({
  SITE_URL: siteOrigin,
  LEADS_DB_PATH: z.string().trim().min(1).default('./var/leads.db'),
  LEAD_NOTIFICATION_EMAIL: z.email(),
  // Timeweb must overwrite this header and prevent clients from supplying it directly.
  TRUSTED_PROXY_HEADER: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
    z.enum(['x-real-ip', 'cf-connecting-ip', 'x-forwarded-for']).default('x-real-ip'),
  ),
  SMTP_HOST: z.string().trim().min(1),
  SMTP_PORT: z.coerce.number().int().positive().max(65_535).default(465),
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
export type TrustedProxyHeader = ServerConfig['TRUSTED_PROXY_HEADER'];

let cachedConfig: ServerConfig | undefined;

export function getServerConfig(): ServerConfig {
  const siteUrl =
    process.env.SITE_URL ??
    (process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:4321');
  cachedConfig ??= serverConfigSchema.parse({ ...process.env, SITE_URL: siteUrl });
  return cachedConfig;
}

export function resetServerConfigForTests(): void {
  cachedConfig = undefined;
}
