import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4321';
const databasePath = '/tmp/nina-e2e.db';
const serverEnvironment = [
  'NODE_ENV=test',
  'HOST=127.0.0.1',
  'PORT=4321',
  `SITE_URL=${baseURL}`,
  `LEADS_DB_PATH=${databasePath}`,
  'LEAD_NOTIFICATION_EMAIL=leads@example.ru',
  'TRUSTED_PROXY_HEADER=x-real-ip',
  'SMTP_HOST=127.0.0.1',
  'SMTP_PORT=2525',
  'SMTP_SECURE=false',
  'SMTP_USER=nina-e2e@example.ru',
  'SMTP_PASSWORD=local-e2e-password',
  'SMTP_FROM=nina-e2e@example.ru',
  'RATE_LIMIT_SECRET=84a97e92cfab48e4ab798d70c70ea6a1',
].join(' ');

export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'dot' : 'list',
  use: {
    baseURL,
    extraHTTPHeaders: { 'x-real-ip': '127.0.0.1' },
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], browserName: 'chromium' },
    },
  ],
  webServer: {
    command: `rm -f ${databasePath} ${databasePath}-shm ${databasePath}-wal && env ${serverEnvironment} node dist/server/entry.mjs`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
