import { expect, test, type Page } from '@playwright/test';
import { declineAnalytics } from './helpers';

const formValues = {
  name: 'Анна',
  preferredContact: '@anna',
  situation: 'Ребенку сложно самостоятельно начинать задания.',
};

async function fillContactForm(page: Page): Promise<void> {
  const form = page.locator('[data-contact-form]');
  await form.getByLabel('Ваше имя').fill(formValues.name);
  await form.getByLabel('Удобный контакт').fill(formValues.preferredContact);
  await form.getByLabel('Коротко о ситуации').fill(formValues.situation);
}

test('validates consent, sends bounded attribution, confirms, and resets', async ({ page }) => {
  let requestPayload: Record<string, unknown> | undefined;
  await page.route('**/api/contact', async (route) => {
    requestPayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, requestId: 'test-request-1' }),
    });
  });
  const oversizedSource = 's'.repeat(140);
  const parameters = new URLSearchParams({
    utm_source: oversizedSource,
    utm_medium: 'social',
    utm_campaign: 'august',
    utm_content: 'hero',
    utm_term: 'tutor',
  });
  await page.goto(`/?${parameters}#contact`);
  await declineAnalytics(page);

  const form = page.locator('[data-contact-form]');
  const checkbox = form.getByRole('checkbox');
  await fillContactForm(page);
  await form.getByRole('button', { name: 'Отправить заявку' }).click();

  await expect(form.locator('[data-form-summary]')).toContainText(
    'подтвердите отдельное согласие',
  );
  expect(await checkbox.evaluate((control: HTMLInputElement) => control.checkValidity())).toBe(false);

  await checkbox.check();
  await form.getByRole('button', { name: 'Отправить заявку' }).click();
  await expect(form.locator('[data-form-status]')).toContainText('test-request-1');

  expect(requestPayload).toBeDefined();
  const payload = requestPayload ?? {};
  expect(Object.keys(payload).sort()).toEqual(
    [
      'consent',
      'consentVersion',
      'name',
      'preferredContact',
      'requestToken',
      'situation',
      'startedAt',
      'utmCampaign',
      'utmContent',
      'utmMedium',
      'utmSource',
      'utmTerm',
      'website',
    ].sort(),
  );
  expect(payload).toMatchObject({
    ...formValues,
    consent: true,
    consentVersion: '1.0',
    website: '',
    utmSource: oversizedSource.slice(0, 120),
    utmMedium: 'social',
    utmCampaign: 'august',
    utmContent: 'hero',
    utmTerm: 'tutor',
  });
  expect(payload.requestToken).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
  expect(Number(payload.startedAt)).toBeGreaterThan(0);
  await expect(form.getByLabel('Ваше имя')).toHaveValue('');
  await expect(form.getByLabel('Удобный контакт')).toHaveValue('');
  await expect(form.getByLabel('Коротко о ситуации')).toHaveValue('');
  await expect(checkbox).not.toBeChecked();
});

test('associates structured server errors and retains entered values', async ({ page }) => {
  await page.route('**/api/contact', (route) =>
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: false,
        message: 'Проверьте данные формы.',
        fields: { preferredContact: 'Укажите другой контакт.' },
      }),
    }),
  );
  await page.goto('/#contact');
  await declineAnalytics(page);

  const form = page.locator('[data-contact-form]');
  await fillContactForm(page);
  await form.getByRole('checkbox').check();
  await form.getByRole('button', { name: 'Отправить заявку' }).click();

  const contact = form.getByLabel('Удобный контакт');
  await expect(form.locator('[data-form-summary]')).toContainText('Проверьте данные формы.');
  await expect(contact).toHaveAttribute('aria-invalid', 'true');
  await expect(contact).toHaveAttribute('aria-describedby', /preferredContact-error/);
  await expect(page.locator('#preferredContact-error')).toHaveText('Укажите другой контакт.');
  await expect(form.getByLabel('Ваше имя')).toHaveValue(formValues.name);
  await expect(contact).toHaveValue(formValues.preferredContact);
  await expect(form.getByLabel('Коротко о ситуации')).toHaveValue(formValues.situation);
  await expect(form.getByRole('checkbox')).toBeChecked();
});

test('retains entered values after a network failure', async ({ page }) => {
  await page.route('**/api/contact', (route) => route.abort('failed'));
  await page.goto('/#contact');
  await declineAnalytics(page);

  const form = page.locator('[data-contact-form]');
  await fillContactForm(page);
  await form.getByRole('checkbox').check();
  await form.getByRole('button', { name: 'Отправить заявку' }).click();

  await expect(form.locator('[data-form-summary]')).toContainText('Не удалось получить ответ сервера.');
  await expect(form.locator('[data-form-status]')).toContainText('Заявка могла сохраниться.');
  await expect(form.getByLabel('Ваше имя')).toHaveValue(formValues.name);
  await expect(form.getByLabel('Удобный контакт')).toHaveValue(formValues.preferredContact);
  await expect(form.getByLabel('Коротко о ситуации')).toHaveValue(formValues.situation);
  await expect(form.getByRole('checkbox')).toBeChecked();
});
