import type { APIRoute } from 'astro';
import { getServerConfig } from '../../server/config';
import { getClientIp, errorResponse, wantsJson } from '../../server/http';
import {
  parseLeadRequest,
  UnsupportedMediaTypeError,
} from '../../server/lead-schema';
import { saveLead, setNotificationStatus } from '../../server/leads';
import { notifyLead } from '../../server/notify';
import { consumeRateLimit } from '../../server/rate-limit';

export const prerender = false;

const validationMessages: Record<string, string> = {
  name: 'Укажите имя длиной от 2 до 80 символов.',
  preferredContact: 'Укажите телефон, email или ник в мессенджере.',
  situation: 'Опишите ситуацию текстом длиной от 10 до 1000 символов.',
  consent: 'Подтвердите отдельное согласие на обработку персональных данных.',
  consentVersion: 'Обновите страницу и подтвердите согласие еще раз.',
  website: 'Не удалось проверить данные формы.',
};

function methodNotAllowed(request: Request): Response {
  const response = errorResponse(
    wantsJson(request),
    405,
    'Поддерживается только отправка формы методом POST.',
  );
  response.headers.set('Allow', 'POST');
  return response;
}

function isSameOriginRequest(request: Request, json: boolean): boolean {
  const origin = request.headers.get('origin');

  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) return false;
    } catch {
      return false;
    }
  } else if (json) {
    return false;
  }

  const fetchSite = request.headers.get('sec-fetch-site')?.toLowerCase();
  return !fetchSite || fetchSite === 'same-origin' || fetchSite === 'none';
}

export const POST: APIRoute = async ({ request }) => {
  const json = wantsJson(request);

  if (!isSameOriginRequest(request, json)) {
    return errorResponse(json, 403, 'Не удалось подтвердить источник запроса.');
  }

  let clientIp: string | null;

  try {
    const config = getServerConfig();
    clientIp = getClientIp(request.headers, config.TRUSTED_PROXY_HEADER);
  } catch {
    console.error('server_config_failed');
    return errorResponse(json, 503, 'Не удалось проверить запрос. Попробуйте позже.');
  }

  if (!clientIp) {
    if (process.env.NODE_ENV === 'production') {
      return errorResponse(json, 503, 'Не удалось проверить запрос. Попробуйте позже.');
    }

    clientIp = '127.0.0.1';
  }

  try {
    if (!consumeRateLimit(clientIp)) {
      const response = errorResponse(
        json,
        429,
        'Слишком много попыток. Попробуйте отправить заявку через 10 минут.',
      );
      response.headers.set('Retry-After', '600');
      return response;
    }
  } catch {
    console.error('rate_limit_failed');
    return errorResponse(json, 503, 'Не удалось проверить запрос. Попробуйте позже.');
  }

  let parsed: Awaited<ReturnType<typeof parseLeadRequest>>;

  try {
    parsed = await parseLeadRequest(request);
  } catch (error) {
    if (error instanceof UnsupportedMediaTypeError) {
      return errorResponse(json, 415, 'Формат запроса не поддерживается.');
    }
    if (error instanceof Error && error.message.startsWith('Body size limit exceeded:')) {
      return errorResponse(json, 413, 'Данные формы слишком большие.');
    }

    return errorResponse(json, 400, 'Не удалось прочитать данные формы.');
  }

  if (!parsed.success) {
    const fields: Record<string, string> = {};

    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? 'form');
      fields[field] ??= validationMessages[field] ?? 'Проверьте данные формы.';
    }

    return errorResponse(
      json,
      400,
      'Проверьте обязательные поля и отдельное согласие.',
      fields,
    );
  }

  if (parsed.data.startedAt !== undefined && Date.now() - parsed.data.startedAt < 2500) {
    return errorResponse(json, 400, 'Пожалуйста, заполните форму чуть внимательнее.');
  }

  let lead: ReturnType<typeof saveLead>;

  try {
    lead = saveLead(parsed.data);
  } catch {
    console.error('lead_storage_failed');
    return errorResponse(json, 503, 'Не удалось сохранить заявку. Попробуйте позже.');
  }

  try {
    await notifyLead(lead.id, parsed.data);
    setNotificationStatus(lead.id, 'sent');
  } catch {
    console.error('lead_notification_failed', lead.id);

    try {
      setNotificationStatus(lead.id, 'failed');
    } catch {
      console.error('lead_notification_status_failed', lead.id);
    }
  }

  if (json) {
    return Response.json(
      { ok: true, requestId: lead.id },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  return new Response(null, {
    status: 303,
    headers: {
      'Cache-Control': 'no-store',
      Location: '/thanks/',
    },
  });
};

export const ALL: APIRoute = ({ request }) => methodNotAllowed(request);
