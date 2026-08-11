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

  if (process.env.RATE_LIMIT_SECRET.length < 32) {
    throw new Error('RATE_LIMIT_SECRET must be at least 32 characters long');
  }
}
