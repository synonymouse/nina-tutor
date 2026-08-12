import { isIP } from 'node:net';
import type { TrustedProxyHeader } from './config';

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
      ? normalizeAddress(address)
      : null;
  }

  const normalizedAddress = normalizeAddress(candidate);
  if (normalizedAddress) return normalizedAddress;

  const ipv4WithPort = candidate.match(/^(\d{1,3}(?:\.\d{1,3}){3}):(\d{1,5})$/);
  if (!ipv4WithPort) return null;

  const address = ipv4WithPort[1];
  return address && validPort(ipv4WithPort[2]) && isIP(address) === 4 ? address : null;
}

function normalizeAddress(address: string): string | null {
  const version = isIP(address);
  if (version === 4) return address;
  if (version !== 6) return null;

  try {
    return new URL(`http://[${address}]/`).hostname.slice(1, -1);
  } catch {
    return null;
  }
}

export function getClientIp(
  headers: Headers,
  trustedHeader: TrustedProxyHeader,
): string | null {
  const value = headers.get(trustedHeader);
  if (trustedHeader !== 'x-forwarded-for') return normalizeIp(value);
  if (!value || /[\r\n\0]/.test(value)) return null;

  return normalizeIp(value.split(',', 1)[0] ?? null);
}

export function wantsJson(request: Request): boolean {
  const contentType = (request.headers.get('content-type') ?? '')
    .split(';', 1)[0]
    ?.trim()
    .toLowerCase();
  if (contentType === 'application/json') return true;

  return (request.headers.get('accept') ?? '').split(',').some((value) => {
    const [mediaType, ...parameters] = value.split(';');
    if (mediaType?.trim().toLowerCase() !== 'application/json') return false;

    const quality = parameters
      .map((parameter) => parameter.trim().toLowerCase())
      .find((parameter) => parameter.startsWith('q='));
    if (!quality) return true;

    const parsedQuality = Number(quality.slice(2));
    return Number.isFinite(parsedQuality) && parsedQuality > 0 && parsedQuality <= 1;
  });
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

const fieldLabels: Record<string, string> = {
  name: 'Ваше имя',
  preferredContact: 'Удобный контакт',
  situation: 'Описание ситуации',
  consent: 'Согласие',
  consentVersion: 'Версия согласия',
  website: 'Проверка формы',
  startedAt: 'Время заполнения',
  requestToken: 'Идентификатор заявки',
};

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
            `<li><strong>${escapeHtml(fieldLabels[field] ?? 'Поле формы')}:</strong> ${escapeHtml(fieldMessage)}</li>`,
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
