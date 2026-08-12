import type { APIRoute } from 'astro';
import { getServerConfig } from '../../server/config';
import { getClientIp, errorResponse, wantsJson } from '../../server/http';
import {
  parseLeadRequest,
  UnsupportedMediaTypeError,
} from '../../server/lead-schema';
import {
  getLeadByRequestToken,
  IdempotencyConflictError,
  saveLead,
  setNotificationStatus,
} from '../../server/leads';
import { notifyLead } from '../../server/notify';
import { consumeRateLimit } from '../../server/rate-limit';
import { createLeadFingerprint } from '../../server/lead-fingerprint';

export const prerender = false;

const validationMessages: Record<string, string> = {
  name: 'Укажите имя длиной от 2 до 80 символов.',
  preferredContact: 'Укажите телефон, email или ник в мессенджере.',
  situation: 'Опишите ситуацию текстом длиной от 10 до 1000 символов.',
  consent: 'Подтвердите отдельное согласие на обработку персональных данных.',
  consentVersion: 'Обновите страницу и подтвердите согласие еще раз.',
  website: 'Не удалось проверить данные формы.',
  requestToken: 'Обновите страницу и попробуйте отправить заявку еще раз.',
};

const idempotencyConflictMessage =
  'Данные формы изменились после первой отправки. Обновите страницу или начните новую заявку.';

function methodNotAllowed(request: Request): Response {
  const response = errorResponse(
    wantsJson(request),
    405,
    'Поддерживается только отправка формы методом POST.',
  );
  response.headers.set('Allow', 'POST');
  return response;
}

function isSameOriginRequest(request: Request, json: boolean, siteOrigin: string): boolean {
  const origin = request.headers.get('origin');

  if (origin) {
    try {
      if (new URL(origin).origin !== siteOrigin) return false;
    } catch {
      return false;
    }
  } else if (json) {
    return false;
  }

  const fetchSite = request.headers.get('sec-fetch-site')?.toLowerCase();
  return !fetchSite || fetchSite === 'same-origin' || fetchSite === 'none';
}

function successResponse(json: boolean, requestId: string): Response {
  if (json) {
    return Response.json(
      { ok: true, requestId },
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
}

export const POST: APIRoute = async ({ request }) => {
  const json = wantsJson(request);
  let config: ReturnType<typeof getServerConfig>;

  try {
    config = getServerConfig();
  } catch {
    console.error('server_config_failed');
    return errorResponse(json, 503, 'Не удалось проверить запрос. Попробуйте позже.');
  }

  if (!isSameOriginRequest(request, json, new URL(config.SITE_URL).origin)) {
    return errorResponse(json, 403, 'Не удалось подтвердить источник запроса.');
  }

  let clientIp = getClientIp(request.headers, config.TRUSTED_PROXY_HEADER);

  if (!clientIp) {
    if (process.env.NODE_ENV === 'production') {
      return errorResponse(json, 503, 'Не удалось проверить запрос. Попробуйте позже.');
    }

    clientIp = '127.0.0.1';
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

  if (parsed.data.requestToken) {
    try {
      const fingerprint = createLeadFingerprint(parsed.data);
      const existingLead = getLeadByRequestToken(parsed.data.requestToken, fingerprint);
      if (existingLead) return successResponse(json, existingLead.id);
    } catch (error) {
      if (error instanceof IdempotencyConflictError) {
        return errorResponse(json, 409, idempotencyConflictMessage);
      }
      console.error('lead_storage_failed');
      return errorResponse(json, 503, 'Не удалось сохранить заявку. Попробуйте позже.');
    }
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

  let lead: ReturnType<typeof saveLead>;

  try {
    lead = saveLead(parsed.data);
  } catch (error) {
    if (error instanceof IdempotencyConflictError) {
      return errorResponse(json, 409, idempotencyConflictMessage);
    }
    console.error('lead_storage_failed');
    return errorResponse(json, 503, 'Не удалось сохранить заявку. Попробуйте позже.');
  }

  if (lead.duplicate) return successResponse(json, lead.id);

  let notificationSent = false;

  try {
    await notifyLead(lead.id, parsed.data);
    notificationSent = true;
  } catch {
    console.error('lead_notification_failed', lead.id);
  }

  if (notificationSent) {
    try {
      setNotificationStatus(lead.id, 'sent');
    } catch {
      console.error('lead_notification_status_failed', lead.id);
    }
  } else {
    try {
      setNotificationStatus(lead.id, 'failed');
    } catch {
      console.error('lead_notification_status_failed', lead.id);
    }
  }

  return successResponse(json, lead.id);
};

export const ALL: APIRoute = ({ request }) => methodNotAllowed(request);
