const form = document.querySelector<HTMLFormElement>('[data-contact-form]');

if (form && form.dataset.contactFormBound !== 'true') {
  const contactForm = form;
  contactForm.dataset.contactFormBound = 'true';

  const summary = contactForm.querySelector<HTMLElement>('[data-form-summary]');
  const status = contactForm.querySelector<HTMLElement>('[data-form-status]');
  const submitButton = contactForm.querySelector<HTMLButtonElement>('button[type="submit"]');
  const startedAt = contactForm.querySelector<HTMLInputElement>('[data-started-at]');
  const requestToken = contactForm.querySelector<HTMLInputElement>('[data-request-token]');
  const utmFields = {
    utm_source: 'utmSource',
    utm_medium: 'utmMedium',
    utm_campaign: 'utmCampaign',
    utm_content: 'utmContent',
    utm_term: 'utmTerm',
  } as const;
  const confirmedTokens = new Set<string>();
  let submitting = false;

  function createRequestToken(): string {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();

    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
    bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  function setRequestToken() {
    if (requestToken) requestToken.value = createRequestToken();
  }

  function setStartedAt() {
    if (startedAt) startedAt.value = String(Date.now());
  }

  function showSummary(message: string, focus = false) {
    if (!summary) return;

    summary.textContent = message;
    summary.hidden = false;
    if (focus) summary.focus();
  }

  function hideSummary() {
    if (!summary) return;

    summary.textContent = '';
    summary.hidden = true;
  }

  function clearFieldError(control: Element) {
    const name = control.getAttribute('name');
    if (!name) return;

    control.removeAttribute('aria-invalid');
    const errorId = `${name}-error`;
    const descriptions = (control.getAttribute('aria-describedby') ?? '')
      .split(/\s+/)
      .filter((id) => id && id !== errorId);

    if (descriptions.length > 0) {
      control.setAttribute('aria-describedby', descriptions.join(' '));
    } else {
      control.removeAttribute('aria-describedby');
    }
    document.getElementById(errorId)?.remove();
  }

  function clearFieldErrors() {
    contactForm.querySelectorAll('[aria-invalid="true"]').forEach(clearFieldError);
  }

  function showFieldErrors(fields: Record<string, unknown>) {
    for (const [name, message] of Object.entries(fields)) {
      if (typeof message !== 'string' || message.length > 300) continue;

      const control = contactForm.elements.namedItem(name);
      if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement)) {
        continue;
      }

      clearFieldError(control);
      const error = document.createElement('small');
      const errorId = `${name}-error`;
      error.id = errorId;
      error.className = 'contact-form__error';
      error.textContent = message;

      const field = control.closest('label');
      (field ?? control).insertAdjacentElement('afterend', error);
      const descriptions = (control.getAttribute('aria-describedby') ?? '')
        .split(/\s+/)
        .filter(Boolean);
      control.setAttribute('aria-describedby', [...descriptions, errorId].join(' '));
      control.setAttribute('aria-invalid', 'true');
    }
  }

  function setBusy(busy: boolean) {
    submitting = busy;
    submitButton?.toggleAttribute('disabled', busy);

    if (busy) {
      contactForm.setAttribute('aria-busy', 'true');
      submitButton?.setAttribute('aria-busy', 'true');
    } else {
      contactForm.removeAttribute('aria-busy');
      submitButton?.removeAttribute('aria-busy');
    }
  }

  const search = new URLSearchParams(window.location.search);

  for (const [parameter, fieldName] of Object.entries(utmFields)) {
    const value = search.get(parameter);
    if (value === null) continue;

    let input = contactForm.querySelector<HTMLInputElement>(`input[name="${fieldName}"]`);
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = fieldName;
      contactForm.append(input);
    }
    const truncatedValue = value.slice(0, 120);
    input.value = truncatedValue;
    input.defaultValue = truncatedValue;
  }

  setStartedAt();
  setRequestToken();

  contactForm.addEventListener('input', (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      clearFieldError(event.target);
    }
  });

  contactForm.addEventListener(
    'invalid',
    () => {
      showSummary('Проверьте выделенные поля и подтвердите отдельное согласие.');
      if (status) status.textContent = '';
    },
    true,
  );

  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitting) return;

    clearFieldErrors();
    if (!contactForm.reportValidity()) {
      showSummary('Проверьте выделенные поля и подтвердите отдельное согласие.');
      return;
    }

    hideSummary();
    setBusy(true);
    if (status) status.textContent = 'Сохраняем заявку…';

    const payload: Record<string, string | boolean> = {};
    for (const [name, value] of new FormData(contactForm).entries()) {
      if (typeof value === 'string') payload[name] = value;
    }
    payload.consent = true;
    const submittedToken = typeof payload.requestToken === 'string' ? payload.requestToken : '';
    const controller = new AbortController();
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 30_000);

    try {
      const response = await fetch(contactForm.action, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
      let body: unknown = null;

      if (contentType.includes('application/json')) {
        try {
          body = await response.json();
        } catch {
          body = null;
        }
      }

      const result =
        typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : null;

      if (!response.ok) {
        if (typeof result?.fields === 'object' && result.fields !== null) {
          showFieldErrors(result.fields as Record<string, unknown>);
        }
        const serverMessage =
          typeof result?.message === 'string' && result.message.length <= 300
            ? result.message
            : 'Не удалось сохранить заявку. Попробуйте позже.';
        showSummary(serverMessage, true);
        if (status) {
          status.textContent =
            'Данные остались в форме. Попробуйте позже или свяжитесь напрямую.';
        }
        return;
      }

      if (result?.ok !== true || typeof result.requestId !== 'string') {
        showSummary('Сервер вернул неполный ответ. Проверьте результат перед повторной отправкой.', true);
        if (status) {
          status.textContent =
            'Заявка могла сохраниться. Проверьте сообщения или свяжитесь напрямую.';
        }
        return;
      }

      contactForm.reset();
      setStartedAt();
      setRequestToken();
      hideSummary();
      if (status) status.textContent = `Заявка сохранена. Номер: ${result.requestId}`;
      if (!confirmedTokens.has(submittedToken)) {
        confirmedTokens.add(submittedToken);
        window.dispatchEvent(new CustomEvent('nina:goal', { detail: 'form_success' }));
      }
    } catch {
      if (timedOut) {
        const message =
          'Не удалось дождаться подтверждения. Заявка могла сохраниться — повторная отправка с этой страницы безопасна.';
        showSummary(message, true);
        if (status) status.textContent = message;
      } else {
        showSummary('Не удалось получить ответ сервера.', true);
        if (status) {
          status.textContent =
            'Заявка могла сохраниться. Повторите отправку или свяжитесь напрямую.';
        }
      }
    } finally {
      window.clearTimeout(timeout);
      setBusy(false);
    }
  });
}

export {};
