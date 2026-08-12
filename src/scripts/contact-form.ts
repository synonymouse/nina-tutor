const form = document.querySelector<HTMLFormElement>('[data-contact-form]');

if (form && form.dataset.contactFormBound !== 'true') {
  const contactForm = form;
  contactForm.dataset.contactFormBound = 'true';

  const summary = contactForm.querySelector<HTMLElement>('[data-form-summary]');
  const status = contactForm.querySelector<HTMLElement>('[data-form-status]');
  const submitButton = contactForm.querySelector<HTMLButtonElement>('button[type="submit"]');
  const startedAt = contactForm.querySelector<HTMLInputElement>('[data-started-at]');
  const utmFields = {
    utm_source: 'utmSource',
    utm_medium: 'utmMedium',
    utm_campaign: 'utmCampaign',
    utm_content: 'utmContent',
    utm_term: 'utmTerm',
  } as const;
  let submitting = false;

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

    try {
      const response = await fetch(contactForm.action, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
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
      hideSummary();
      if (status) status.textContent = `Заявка сохранена. Номер: ${result.requestId}`;
      window.dispatchEvent(new CustomEvent('nina:goal', { detail: 'form_success' }));
    } catch {
      showSummary('Не удалось получить ответ сервера.', true);
      if (status) {
        status.textContent =
          'Заявка могла сохраниться. Проверьте сообщения или свяжитесь напрямую перед повторной отправкой.';
      }
    } finally {
      setBusy(false);
    }
  });
}

export {};
