import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { expect, test, type APIRequestContext, type TestInfo } from '@playwright/test';

interface LeadRow {
  id: string;
  request_token: string;
  notification_status: string;
}

function requiredEnvironment(name: 'E2E_BASE_URL' | 'E2E_DB_PATH'): string {
  const value = process.env[name];
  if (!value) throw new Error(`Playwright ${name} was not initialized`);
  return value;
}

const baseURL = requiredEnvironment('E2E_BASE_URL');
const databasePath = requiredEnvironment('E2E_DB_PATH');

function validLead(requestToken = randomUUID(), overrides: Record<string, unknown> = {}) {
  return {
    name: 'Анна',
    preferredContact: '@anna',
    situation: 'Ребенку сложно начинать задания самостоятельно.',
    consent: true,
    consentVersion: '1.0',
    website: '',
    requestToken,
    ...overrides,
  };
}

function projectIp(testInfo: TestInfo, host: number): string {
  const projectOffset = testInfo.project.name === 'mobile' ? 100 : 0;
  return `203.0.113.${projectOffset + host}`;
}

async function postJson(
  request: APIRequestContext,
  ip: string,
  payload: Record<string, unknown>,
  origin = baseURL,
) {
  return request.post('/api/contact', {
    data: payload,
    headers: {
      Accept: 'application/json',
      Origin: origin,
      'x-real-ip': ip,
    },
  });
}

function readDatabase<T>(query: (database: Database.Database) => T): T {
  const database = new Database(databasePath, { fileMustExist: true, readonly: true });
  database.pragma('busy_timeout = 5000');
  try {
    return query(database);
  } finally {
    database.close();
  }
}

test.describe('production contact endpoint', () => {
  test.describe.configure({ mode: 'serial' });

  test('persists failed notification and enforces request-token idempotency', async ({
    request,
  }, testInfo) => {
    const ip = projectIp(testInfo, 11);
    const requestToken = randomUUID();
    const payload = validLead(requestToken);

    const firstResponse = await postJson(request, ip, payload);
    expect(firstResponse.status()).toBe(200);
    const firstBody = await firstResponse.json();
    expect(firstBody).toMatchObject({ ok: true });
    expect(firstBody.requestId).toMatch(/^[0-9a-f-]{36}$/);

    const retryResponse = await postJson(request, ip, payload);
    expect(retryResponse.status()).toBe(200);
    await expect(retryResponse.json()).resolves.toEqual(firstBody);

    const conflictResponse = await postJson(request, ip, {
      ...payload,
      situation: 'Ребенку сложно самостоятельно планировать другую задачу.',
    });
    expect(conflictResponse.status()).toBe(409);

    const rows = readDatabase((database) =>
      database
        .prepare(
          'SELECT id, request_token, notification_status FROM leads WHERE request_token = ?',
        )
        .all(requestToken) as LeadRow[],
    );
    expect(rows).toEqual([
      {
        id: firstBody.requestId,
        request_token: requestToken,
        notification_status: 'failed',
      },
    ]);
  });

  test('rejects invalid requests before charging quota and rate-limits the sixth valid lead', async ({
    request,
  }, testInfo) => {
    const ip = projectIp(testInfo, 12);
    const wrongOriginToken = randomUUID();
    const invalidToken = randomUUID();
    const honeypotToken = randomUUID();

    const wrongOriginResponse = await postJson(
      request,
      ip,
      validLead(wrongOriginToken),
      'https://attacker.example',
    );
    expect(wrongOriginResponse.status()).toBe(403);

    const unsupportedResponse = await request.fetch('/api/contact', {
      method: 'POST',
      data: 'plain text',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'text/plain',
        Origin: baseURL,
        'x-real-ip': ip,
      },
    });
    expect(unsupportedResponse.status()).toBe(415);

    const malformedResponse = await request.fetch('/api/contact', {
      method: 'POST',
      data: '{"name":',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Origin: baseURL,
        'x-real-ip': ip,
      },
    });
    expect(malformedResponse.status()).toBe(400);

    const invalidResponse = await postJson(request, ip, {
      ...validLead(invalidToken),
      consent: false,
    });
    expect(invalidResponse.status()).toBe(400);

    const honeypotResponse = await postJson(request, ip, {
      ...validLead(honeypotToken),
      website: 'spam.example',
    });
    expect(honeypotResponse.status()).toBe(400);

    const acceptedTokens = Array.from({ length: 5 }, () => randomUUID());
    for (const requestToken of acceptedTokens) {
      const response = await postJson(request, ip, validLead(requestToken));
      expect(response.status()).toBe(200);
    }

    const blockedToken = randomUUID();
    const limitedResponse = await postJson(request, ip, validLead(blockedToken));
    expect(limitedResponse.status()).toBe(429);
    expect(limitedResponse.headers()['retry-after']).toBe('600');

    const allTokens = [
      wrongOriginToken,
      invalidToken,
      honeypotToken,
      ...acceptedTokens,
      blockedToken,
    ];
    const placeholders = allTokens.map(() => '?').join(', ');
    const storedTokens = readDatabase((database) =>
      database
        .prepare(`SELECT request_token FROM leads WHERE request_token IN (${placeholders})`)
        .all(...allTokens) as Array<{ request_token: string }>,
    ).map((row) => row.request_token);

    expect(storedTokens.sort()).toEqual([...acceptedTokens].sort());
  });
});
