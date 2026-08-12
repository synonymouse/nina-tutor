import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getServerConfig, resetServerConfigForTests } from '../../src/server/config';

const validEnvironment = {
  SITE_URL: 'http://127.0.0.1:4321',
  LEADS_DB_PATH: '/tmp/nina-config-test.db',
  LEAD_NOTIFICATION_EMAIL: 'leads@example.ru',
  TRUSTED_PROXY_HEADER: 'x-real-ip',
  SMTP_HOST: '127.0.0.1',
  SMTP_PORT: '2525',
  SMTP_SECURE: 'false',
  SMTP_USER: 'nina@example.ru',
  SMTP_PASSWORD: 'local-password',
  SMTP_FROM: 'nina@example.ru',
  RATE_LIMIT_SECRET: 'c1472a7344c94194a625c0b792dd558b',
};

function setEnvironment(overrides: Partial<typeof validEnvironment> = {}) {
  for (const [name, value] of Object.entries({ ...validEnvironment, ...overrides })) {
    vi.stubEnv(name, value);
  }
  resetServerConfigForTests();
}

beforeEach(() => setEnvironment());

afterEach(() => {
  resetServerConfigForTests();
  vi.unstubAllEnvs();
});

describe('server config', () => {
  it('trims supported values and normalizes SITE_URL to its origin', () => {
    setEnvironment({
      SITE_URL: '  https://example.ru/some/path  ',
      LEADS_DB_PATH: '  /tmp/leads.db  ',
      TRUSTED_PROXY_HEADER: '  CF-CONNECTING-IP  ',
      SMTP_HOST: '  smtp.example.ru  ',
      SMTP_USER: '  nina@example.ru  ',
      RATE_LIMIT_SECRET: '  c1472a7344c94194a625c0b792dd558b  ',
    });

    expect(getServerConfig()).toMatchObject({
      SITE_URL: 'https://example.ru',
      LEADS_DB_PATH: '/tmp/leads.db',
      TRUSTED_PROXY_HEADER: 'cf-connecting-ip',
      SMTP_HOST: 'smtp.example.ru',
      SMTP_USER: 'nina@example.ru',
      RATE_LIMIT_SECRET: 'c1472a7344c94194a625c0b792dd558b',
    });
  });

  it.each([
    ['LEADS_DB_PATH', '   '],
    ['SMTP_HOST', '   '],
    ['SMTP_USER', '\t'],
    ['RATE_LIMIT_SECRET', '   '],
  ])('rejects whitespace-only %s', (name, value) => {
    setEnvironment({ [name]: value });
    expect(() => getServerConfig()).toThrow();
  });

  it('rejects the documented secret placeholder', () => {
    setEnvironment({ RATE_LIMIT_SECRET: 'replace-with-random-secret-32-characters' });
    expect(() => getServerConfig()).toThrow();
  });

  it.each(['0', '65536', 'not-a-port'])('rejects invalid SMTP port %s', (SMTP_PORT) => {
    setEnvironment({ SMTP_PORT });
    expect(() => getServerConfig()).toThrow();
  });

  it('parses a valid SMTP port', () => {
    setEnvironment({ SMTP_PORT: '2465' });
    expect(getServerConfig().SMTP_PORT).toBe(2465);
  });

  it('accepts only supported trusted proxy headers', () => {
    setEnvironment({ TRUSTED_PROXY_HEADER: 'x-forwarded-for' });
    expect(getServerConfig().TRUSTED_PROXY_HEADER).toBe('x-forwarded-for');

    setEnvironment({ TRUSTED_PROXY_HEADER: 'forwarded' });
    expect(() => getServerConfig()).toThrow();
  });

  it.each(['ftp://example.ru', 'not a URL'])('rejects invalid SITE_URL %s', (SITE_URL) => {
    setEnvironment({ SITE_URL });
    expect(() => getServerConfig()).toThrow();
  });

  it('parses explicit and default SMTP TLS booleans', () => {
    setEnvironment({ SMTP_SECURE: ' FALSE ' });
    expect(getServerConfig().SMTP_SECURE).toBe(false);

    vi.stubEnv('SMTP_SECURE', undefined);
    resetServerConfigForTests();
    expect(getServerConfig().SMTP_SECURE).toBe(true);
  });

  it('rejects an ambiguous TLS boolean', () => {
    setEnvironment({ SMTP_SECURE: 'yes' });
    expect(() => getServerConfig()).toThrow();
  });
});
