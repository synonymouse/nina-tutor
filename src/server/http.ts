import { isIP } from 'node:net';

function validPort(value: string | undefined): boolean {
  if (value === undefined) return true;
  const port = Number(value);
  return Number.isInteger(port) && port >= 1 && port <= 65_535;
}

function normalizeIp(value: string | null): string | null {
  if (!value || /[\r\n\0,]/.test(value)) return null;

  const candidate = value.trim();
  if (!candidate) return null;

  const bracketed = candidate.match(/^\[([^\]]+)](?::(\d{1,5}))?$/);
  if (bracketed) {
    const address = bracketed[1];
    return address && validPort(bracketed[2]) && isIP(address) === 6
      ? address.toLowerCase()
      : null;
  }

  if (isIP(candidate)) return candidate.toLowerCase();

  const ipv4WithPort = candidate.match(/^(\d{1,3}(?:\.\d{1,3}){3}):(\d{1,5})$/);
  if (!ipv4WithPort) return null;

  const address = ipv4WithPort[1];
  return address && validPort(ipv4WithPort[2]) && isIP(address) === 4 ? address : null;
}

export function getClientIp(headers: Headers): string | null {
  const cloudflareIp = normalizeIp(headers.get('cf-connecting-ip'));
  if (cloudflareIp) return cloudflareIp;

  const realIp = normalizeIp(headers.get('x-real-ip'));
  if (realIp) return realIp;

  const forwardedFor = headers.get('x-forwarded-for');
  if (!forwardedFor || /[\r\n\0]/.test(forwardedFor)) return null;

  return normalizeIp(forwardedFor.split(',', 1)[0] ?? null);
}

export function wantsJson(request: Request): boolean {
  const contentType = (request.headers.get('content-type') ?? '')
    .split(';', 1)[0]
    ?.trim()
    .toLowerCase();
  if (contentType === 'application/json') return true;

  return (request.headers.get('accept') ?? '')
    .split(',')
    .some((value) => value.split(';', 1)[0]?.trim().toLowerCase() === 'application/json');
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return entities[character] ?? character;
  });
}

export function errorResponse(
  json: boolean,
  status: number,
  message: string,
  fields?: Record<string, string>,
): Response {
  const headers = { 'Cache-Control': 'no-store' };

  if (json) {
    return Response.json({ ok: false, message, fields }, { status, headers });
  }

  const fieldList = fields
    ? `<ul>${Object.entries(fields)
        .map(
          ([field, fieldMessage]) =>
            `<li><strong>${escapeHtml(field)}:</strong> ${escapeHtml(fieldMessage)}</li>`,
        )
        .join('')}</ul>`
    : '';
  const body = `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Заявка не отправлена</title>
  </head>
  <body>
    <main>
      <h1>Заявка не отправлена</h1>
      <p>${escapeHtml(message)}</p>
      ${fieldList}
      <p><a href="/#contact">Вернуться к форме</a></p>
    </main>
  </body>
</html>`;

  return new Response(body, {
    status,
    headers: {
      ...headers,
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
