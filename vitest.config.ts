import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/server/**/*.test.ts'],
    env: {
      SITE_URL: 'http://127.0.0.1:4321',
      LEADS_DB_PATH: join(tmpdir(), `nina-vitest-default-${process.pid}.db`),
      LEAD_NOTIFICATION_EMAIL: 'leads@example.ru',
      TRUSTED_PROXY_HEADER: 'x-real-ip',
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: '2525',
      SMTP_SECURE: 'false',
      SMTP_USER: 'nina-test@example.ru',
      SMTP_PASSWORD: 'local-test-password',
      SMTP_FROM: 'nina-test@example.ru',
      RATE_LIMIT_SECRET: 'a8f31744c25f4bf392a7e1d96b8c504d',
    },
  },
});
