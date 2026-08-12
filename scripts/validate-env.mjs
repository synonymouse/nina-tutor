if (process.env.NODE_ENV === 'production') {
  const requiredVariables = [
    'SITE_URL',
    'LEADS_DB_PATH',
    'LEAD_NOTIFICATION_EMAIL',
    'TRUSTED_PROXY_HEADER',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASSWORD',
    'SMTP_FROM',
    'RATE_LIMIT_SECRET',
  ];

  const missingVariables = requiredVariables.filter(
    (variable) => !process.env[variable]?.trim(),
  );

  if (missingVariables.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVariables.join(', ')}`);
  }

  const trustedProxyHeaders = [
    'x-real-ip',
    'cf-connecting-ip',
    'x-forwarded-for',
  ];

  if (!trustedProxyHeaders.includes(process.env.TRUSTED_PROXY_HEADER.trim().toLowerCase())) {
    throw new Error('TRUSTED_PROXY_HEADER must name a supported proxy header');
  }

  const rateLimitSecret = process.env.RATE_LIMIT_SECRET.trim();

  if (rateLimitSecret.length < 32 || rateLimitSecret.toLowerCase().startsWith('replace-with')) {
    throw new Error('RATE_LIMIT_SECRET must be at least 32 characters and not be a placeholder');
  }
}
