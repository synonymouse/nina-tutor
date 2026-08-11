if (process.env.NODE_ENV === 'production') {
  const requiredVariables = [
    'SITE_URL',
    'LEADS_DB_PATH',
    'LEAD_NOTIFICATION_EMAIL',
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

  const rateLimitSecret = process.env.RATE_LIMIT_SECRET.trim();

  if (rateLimitSecret.length < 32 || rateLimitSecret.startsWith('replace-with-')) {
    throw new Error('RATE_LIMIT_SECRET must be at least 32 characters and not be a placeholder');
  }
}
