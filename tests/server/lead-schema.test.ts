import { describe, expect, it } from 'vitest';
import {
  leadSchema,
  parseLeadRequest,
  UnsupportedMediaTypeError,
} from '../../src/server/lead-schema';

const requestToken = '5df66b31-610c-49a8-9a90-7627bf527005';
const validLead = {
  name: 'Анна',
  preferredContact: '@anna',
  situation: 'Ребенку сложно начинать задания самостоятельно.',
  consent: true,
  consentVersion: '1.0',
};

describe('lead schema', () => {
  it('accepts and normalizes the minimal approved payload', () => {
    const result = leadSchema.safeParse(validLead);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data).toEqual({
      ...validLead,
      website: '',
      utmSource: '',
      utmMedium: '',
      utmCampaign: '',
      utmContent: '',
      utmTerm: '',
    });
  });

  it('parses a native form request, trims fields, and normalizes consent', async () => {
    const body = new URLSearchParams({
      name: '  Анна  ',
      preferredContact: '  @anna  ',
      situation: '  Ребенку сложно начинать задания самостоятельно.  ',
      consent: 'on',
      consentVersion: '1.0',
      requestToken,
      utmSource: '  telegram  ',
    });
    const request = new Request('http://127.0.0.1:4321/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body,
    });

    const result = await parseLeadRequest(request);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toMatchObject({
      ...validLead,
      requestToken,
      utmSource: 'telegram',
    });
  });

  it('parses a JSON request and ignores unknown keys', async () => {
    const request = new Request('http://127.0.0.1:4321/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...validLead,
        consent: 'true',
        requestToken,
        admin: true,
      }),
    });

    const result = await parseLeadRequest(request);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.requestToken).toBe(requestToken);
    expect(result.data).not.toHaveProperty('admin');
  });

  it.each([
    ['absent separate consent', { ...validLead, consent: false }],
    ['a filled honeypot', { ...validLead, website: 'spam.example' }],
    ['oversized free text', { ...validLead, situation: 'а'.repeat(1001) }],
    ['an invalid request token', { ...validLead, requestToken: 'not-a-uuid' }],
  ])('rejects %s', (_description, payload) => {
    expect(leadSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects duplicate native form fields', async () => {
    const body = new URLSearchParams({
      ...Object.fromEntries(Object.entries(validLead).map(([key, value]) => [key, String(value)])),
    });
    body.append('name', 'Другая Анна');
    const request = new Request('http://127.0.0.1:4321/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const result = await parseLeadRequest(request);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((issue) => issue.path[0] === 'name')).toBe(true);
  });

  it('throws a typed error for unsupported media', async () => {
    const request = new Request('http://127.0.0.1:4321/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'not a supported form',
    });

    await expect(parseLeadRequest(request)).rejects.toBeInstanceOf(UnsupportedMediaTypeError);
  });

  it('rejects malformed JSON through the native request parser', async () => {
    const request = new Request('http://127.0.0.1:4321/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"name":',
    });

    await expect(parseLeadRequest(request)).rejects.toBeInstanceOf(SyntaxError);
  });
});
