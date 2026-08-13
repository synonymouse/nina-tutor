import { expect, test, type BrowserContext, type Page } from '@playwright/test';

declare global {
  interface Window {
    __ymCalls?: unknown[][];
  }
}

const storageKey = 'nina:analytics-consent:v1';

async function requireMetricaBuild(page: Page): Promise<void> {
  test.skip(
    (await page.locator('[data-cookie-panel]').count()) === 0,
    'This production build has no Metrica counter configured.',
  );
}

async function mockMetrica(context: BrowserContext, requests: string[]): Promise<void> {
  await context.route('https://mc.yandex.ru/**', async (route) => {
    requests.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `
        window.__ymCalls = Array.isArray(window.ym && window.ym.a) ? [...window.ym.a] : [];
        window.ym = (...args) => window.__ymCalls.push(args);
      `,
    });
  });
}

async function passBrowserIdle(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        if (typeof window.requestIdleCallback === 'function') {
          window.requestIdleCallback(() => resolve(), { timeout: 1000 });
        } else {
          window.setTimeout(resolve, 0);
        }
      }),
  );
}

async function hasYmCall(page: Page, action: string, value?: string): Promise<boolean> {
  return page.evaluate(
    ([expectedAction, expectedValue]) =>
      (window.__ymCalls ?? []).some(
        (call) => call[1] === expectedAction && (expectedValue === undefined || call[2] === expectedValue),
      ),
    [action, value] as const,
  );
}

test('does not load Metrica before consent and persists decline', async ({ context, page }) => {
  const requests: string[] = [];
  await mockMetrica(context, requests);
  await page.goto('/');
  await requireMetricaBuild(page);

  const panel = page.locator('[data-cookie-panel]');
  await expect(panel).toBeVisible();
  await passBrowserIdle(page);
  expect(requests).toEqual([]);

  await panel.getByRole('button', { name: 'Не разрешать' }).click();
  await expect(panel).toBeHidden();
  await page.reload();
  await expect(panel).toBeHidden();
  await passBrowserIdle(page);

  expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe('declined');
  expect(requests).toEqual([]);
});

test('loads after acceptance and forwards only approved goals', async ({ context, page }) => {
  const requests: string[] = [];
  await mockMetrica(context, requests);
  await page.goto('/');
  await requireMetricaBuild(page);

  await page.getByRole('button', { name: 'Разрешить' }).click();
  await expect.poll(() => requests.length).toBe(1);
  await expect.poll(() => hasYmCall(page, 'init')).toBe(true);
  const initCall = await page.evaluate(() =>
    (window.__ymCalls ?? []).find((call) => call[1] === 'init'),
  );
  expect(initCall).toEqual([
    123456,
    'init',
    {
      clickmap: false,
      trackLinks: false,
      accurateTrackBounce: true,
      webvisor: false,
    },
  ]);

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('nina:goal', { detail: 'contact_open' }));
    window.dispatchEvent(new CustomEvent('nina:goal', { detail: 'unapproved_goal' }));
  });
  await expect.poll(() => hasYmCall(page, 'reachGoal', 'contact_open')).toBe(true);

  const goalCalls = await page.evaluate(() =>
    (window.__ymCalls ?? [])
      .filter((call) => call[1] === 'reachGoal')
  );
  expect(goalCalls).toEqual([[123456, 'reachGoal', 'contact_open']]);
});

test('synchronizes cross-tab decline, tears down, and blocks later goals', async ({
  context,
  page,
}) => {
  const requests: string[] = [];
  await mockMetrica(context, requests);
  await page.goto('/');
  await requireMetricaBuild(page);
  await page.getByRole('button', { name: 'Разрешить' }).click();
  await expect.poll(() => hasYmCall(page, 'init')).toBe(true);

  const secondPage = await context.newPage();
  await secondPage.goto('/');
  await expect.poll(() => hasYmCall(secondPage, 'init')).toBe(true);
  await secondPage.getByRole('button', { name: 'Настройки аналитики' }).click();
  await secondPage.getByRole('button', { name: 'Не разрешать' }).click();

  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), storageKey))
    .toBe('declined');
  await expect.poll(() => hasYmCall(page, 'destruct')).toBe(true);
  await expect(page.locator('script[data-yandex-metrica]')).toHaveCount(0);

  const goalsBefore = await page.evaluate(
    () => (window.__ymCalls ?? []).filter((call) => call[1] === 'reachGoal').length,
  );
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('nina:goal', { detail: 'form_success' }));
  });
  await passBrowserIdle(page);
  const goalsAfter = await page.evaluate(
    () => (window.__ymCalls ?? []).filter((call) => call[1] === 'reachGoal').length,
  );

  expect(goalsAfter).toBe(goalsBefore);
  await secondPage.close();
});
