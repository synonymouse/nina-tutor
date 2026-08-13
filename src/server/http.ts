import { isIP } from 'node:net';
import type { TrustedProxyHeader } from './config';
import type { LeadReplayValues } from './lead-schema';

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
  replay?: LeadReplayValues,
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
    <meta name="robots" content="noindex,nofollow">
    <title>Заявка не отправлена</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; color: #17251f; background: #f5efe5; font: 16px/1.55 system-ui, sans-serif; }
      main { width: min(42rem, calc(100% - 2rem)); margin: 0 auto; padding: 2rem 0 3rem; }
      h1, h2 { line-height: 1.2; }
      .notice { padding: 1rem; border-left: .3rem solid #9b3150; background: #fff; }
      form { display: grid; gap: 1rem; margin-top: 1.5rem; padding: 1.25rem; border: 2px solid #17251f; border-radius: 1rem; background: #fff; }
      label:not(.consent) { display: grid; gap: .35rem; font-weight: 700; }
      input:not([type="checkbox"]), textarea { width: 100%; min-height: 3rem; padding: .7rem; border: 1px solid #17251f; border-radius: .4rem; font-size: 1rem; }
      textarea { min-height: 8rem; resize: vertical; }
      .consent { display: grid; grid-template-columns: 1.4rem minmax(0, 1fr); gap: .7rem; }
      .consent input { width: 1.4rem; height: 1.4rem; margin: .15rem 0 0; }
      .warning { margin: 0; color: #4c5b54; }
      button { min-height: 3rem; padding: .7rem 1.2rem; border: 2px solid #17251f; border-radius: 999px; background: #f5cf58; font-weight: 750; cursor: pointer; }
      a { text-underline-offset: .2em; }
      :focus-visible { outline: 3px solid #9b3150; outline-offset: 3px; }
      .direct { display: flex; flex-wrap: wrap; gap: .8rem 1.2rem; }
      .honeypot { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }
    </style>
  </head>
  <body>
    <main>
      <h1>Заявка не отправлена</h1>
      <div class="notice" role="alert">
        <p>${escapeHtml(message)}</p>
        ${fieldList}
      </div>
      <form method="POST" action="/api/contact" aria-labelledby="retry-title">
        <h2 id="retry-title">Исправьте данные и попробуйте снова</h2>
        <label>
          <span>Ваше имя</span>
          <input type="text" name="name" autocomplete="name" minlength="2" maxlength="80" required value="${escapeHtml(replay?.name ?? '')}">
        </label>
        <label>
          <span>Удобный контакт</span>
          <input type="text" name="preferredContact" autocomplete="off" minlength="3" maxlength="120" required value="${escapeHtml(replay?.preferredContact ?? '')}">
        </label>
        <label>
          <span>Коротко о ситуации</span>
          <textarea name="situation" rows="5" minlength="10" maxlength="1000" required>${escapeHtml(replay?.situation ?? '')}</textarea>
        </label>
        <p class="warning">Не указывайте фамилию ребенка, диагнозы, документы и другие чувствительные сведения.</p>
        <label class="consent">
          <input type="checkbox" name="consent" required${replay?.consent ? ' checked' : ''}>
          <span>Даю <a href="/consent/" target="_blank" rel="noopener">согласие на обработку персональных данных</a> и ознакомился(-ась) с <a href="/privacy/" target="_blank" rel="noopener">политикой</a>.</span>
        </label>
        <input type="hidden" name="consentVersion" value="1.0">
        <input type="hidden" name="startedAt" value="">
        <input type="hidden" name="requestToken" value="">
        <label class="honeypot" aria-hidden="true">Ваш сайт<input type="text" name="website" tabindex="-1" autocomplete="off" value=""></label>
        <button type="submit">Отправить заявку</button>
      </form>
      <h2>Связаться напрямую</h2>
      <p class="direct">
        <a href="https://t.me/ninixer">Telegram</a>
        <a href="https://wa.me/79777498243?text=%D0%97%D0%B4%D1%80%D0%B0%D0%B2%D1%81%D1%82%D0%B2%D1%83%D0%B9%D1%82%D0%B5%2C%20%D0%9D%D0%B8%D0%BD%D0%B0!%20%D0%A5%D0%BE%D1%87%D1%83%20%D0%BE%D0%B1%D1%81%D1%83%D0%B4%D0%B8%D1%82%D1%8C%20%D1%81%D0%B8%D1%82%D1%83%D0%B0%D1%86%D0%B8%D1%8E%20%D0%B8%20%D0%B1%D0%B5%D1%81%D0%BF%D0%BB%D0%B0%D1%82%D0%BD%D0%BE%D0%B5%20%D0%B7%D0%BD%D0%B0%D0%BA%D0%BE%D0%BC%D1%81%D1%82%D0%B2%D0%BE.">WhatsApp</a>
        <a href="mailto:dyachenko.nina139@gmail.com">Email</a>
      </p>
      <p><a href="/#contact">Вернуться на главную</a></p>
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
