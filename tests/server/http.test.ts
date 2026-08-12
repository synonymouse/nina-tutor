import { describe, expect, it } from 'vitest';
import { errorResponse, getClientIp, wantsJson } from '../../src/server/http';

describe('HTTP helpers', () => {
  it('uses only the configured trusted proxy header', () => {
    const headers = new Headers({
      'x-real-ip': '203.0.113.10',
      'cf-connecting-ip': '198.51.100.8',
      'x-forwarded-for': '192.0.2.4',
    });

    expect(getClientIp(headers, 'x-real-ip')).toBe('203.0.113.10');
    expect(getClientIp(headers, 'cf-connecting-ip')).toBe('198.51.100.8');
    expect(getClientIp(new Headers({ 'x-forwarded-for': '192.0.2.4, 10.0.0.2' }), 'x-forwarded-for'))
      .toBe('192.0.2.4');
    expect(getClientIp(new Headers({ 'x-forwarded-for': '192.0.2.4' }), 'x-real-ip')).toBeNull();
  });

  it.each(['', 'not-an-ip', '203.0.113.1, 198.51.100.1', '203.0.113.1:70000']) (
    'rejects an invalid selected header value: %s',
    (value) => {
      expect(getClientIp(new Headers({ 'x-real-ip': value }), 'x-real-ip')).toBeNull();
    },
  );

  it('canonicalizes equivalent IPv6 spellings', () => {
    const expanded = getClientIp(
      new Headers({ 'x-real-ip': '2001:0db8:0000:0000:0000:0000:0000:0001' }),
      'x-real-ip',
    );
    const compressed = getClientIp(new Headers({ 'x-real-ip': '[2001:db8::1]:443' }), 'x-real-ip');

    expect(expanded).toBe('2001:db8::1');
    expect(compressed).toBe(expanded);
  });

  it('honors JSON content type and positive explicit JSON Accept quality only', () => {
    expect(
      wantsJson(
        new Request('http://127.0.0.1/', {
          headers: { 'Content-Type': 'application/json', Accept: 'text/html' },
        }),
      ),
    ).toBe(true);
    expect(
      wantsJson(new Request('http://127.0.0.1/', { headers: { Accept: 'application/json;q=0.4' } })),
    ).toBe(true);
    expect(
      wantsJson(new Request('http://127.0.0.1/', { headers: { Accept: 'application/json;q=0' } })),
    ).toBe(false);
    expect(wantsJson(new Request('http://127.0.0.1/', { headers: { Accept: '*/*' } }))).toBe(
      false,
    );
  });

  it('escapes HTML errors and prevents caching', async () => {
    const response = errorResponse(false, 400, '<script>alert("message")</script>', {
      situation: '<img src=x onerror=alert(1)>',
    });
    const body = await response.text();

    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(body).not.toContain('<script>');
    expect(body).not.toContain('<img');
    expect(body).toContain('&lt;script&gt;alert(&quot;message&quot;)&lt;/script&gt;');
    expect(body).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('marks JSON errors as no-store', async () => {
    const response = errorResponse(true, 409, 'Конфликт');

    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({
      ok: false,
      message: 'Конфликт',
    });
  });
});
