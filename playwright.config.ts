import { defineConfig, devices } from '@playwright/test';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const minimumDynamicPort = 49_152;
const dynamicPortRange = 65_536 - minimumDynamicPort;

function probePort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.unref();
    server.once('error', () => resolve(false));
    server.listen(port, '127.0.0.1', () => server.close(() => resolve(true)));
  });
}

async function selectPort(): Promise<number> {
  if (process.env.E2E_PORT !== undefined) {
    const configuredPort = Number(process.env.E2E_PORT);
    if (!Number.isInteger(configuredPort) || configuredPort < 1 || configuredPort > 65_535) {
      throw new Error('E2E_PORT must be an integer from 1 to 65535');
    }
    return configuredPort;
  }

  for (let attempt = 0; attempt < 64; attempt += 1) {
    const port = minimumDynamicPort + ((process.pid * 37 + attempt * 1_013) % dynamicPortRange);
    if (await probePort(port)) return port;
  }

  throw new Error('Unable to find an available E2E port');
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

const runId = process.env.E2E_RUN_ID ?? String(process.pid);
const port = await selectPort();
const baseURL = `http://127.0.0.1:${port}`;
const databasePath = process.env.E2E_DB_PATH ?? join(tmpdir(), `nina-e2e-${runId}.db`);
const distPath = resolve(process.env.E2E_DIST_DIR ?? process.env.ASTRO_OUT_DIR ?? 'dist');
const artifactPath =
  process.env.E2E_ARTIFACT_DIR ?? join(tmpdir(), `nina-e2e-results-${runId}`);
const databaseFiles = [databasePath, `${databasePath}-shm`, `${databasePath}-wal`]
  .map(shellQuote)
  .join(' ');

process.env.E2E_RUN_ID = runId;
process.env.E2E_PORT = String(port);
process.env.E2E_BASE_URL = baseURL;
process.env.E2E_DB_PATH = databasePath;

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: artifactPath,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'dot' : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        extraHTTPHeaders: { 'x-real-ip': '198.51.100.10' },
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 13'],
        browserName: 'chromium',
        extraHTTPHeaders: { 'x-real-ip': '198.51.100.20' },
      },
    },
  ],
  webServer: {
    command: `rm -f ${databaseFiles} && trap 'rm -f ${databaseFiles}' EXIT && node ${shellQuote(join(distPath, 'server', 'entry.mjs'))}`,
    env: {
      NODE_ENV: 'test',
      HOST: '127.0.0.1',
      PORT: String(port),
      SITE_URL: baseURL,
      LEADS_DB_PATH: databasePath,
      LEAD_NOTIFICATION_EMAIL: 'leads@example.ru',
      TRUSTED_PROXY_HEADER: 'x-real-ip',
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: '1',
      SMTP_SECURE: 'false',
      SMTP_USER: 'nina-e2e@example.ru',
      SMTP_PASSWORD: 'local-e2e-password',
      SMTP_FROM: 'nina-e2e@example.ru',
      RATE_LIMIT_SECRET: '84a97e92cfab48e4ab798d70c70ea6a1',
    },
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
