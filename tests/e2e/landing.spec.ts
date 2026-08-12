import { devices, expect, test } from '@playwright/test';
import { declineAnalytics } from './helpers';

const prices = [
  '15 000 ₽ · единоразово',
  '9 000 ₽ · разово',
  '40 000 ₽ / месяц',
  '20 000 ₽ / месяц',
  '40 000 ₽ / месяц',
];

const questions = [
  'В каком возрасте вы работаете?',
  'Вы помогаете именно с учебными предметами?',
  'А если ребенок сам не хочет заниматься?',
  'Родители присутствуют на занятиях?',
  'Можно начать не с долгой программы?',
  'Что будет, если ребенку больше не нужна помощь?',
];

test('renders the approved landing content and responsive navigation', async ({ page }, testInfo) => {
  await page.goto('/');
  await declineAnalytics(page);

  await expect(page).toHaveTitle(/Нина Дьяченко.*образовательный наставник/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('самостоятельно');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.locator('.offer')).toHaveCount(5);
  await expect(page.locator('.offer__price')).toHaveText(prices);
  await expect(page.locator('.faq__list details')).toHaveCount(6);
  await expect(page.locator('.faq__list summary span:first-child')).toHaveText(questions);

  const desktopLinks = page.locator('.site-header__nav a');
  expect(await desktopLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual(
    ['#approach', '#about', '#offers'],
  );
  await expect(page.locator('[data-hero] [data-contact-trigger]')).toHaveAttribute(
    'href',
    '#contact',
  );

  const faqItem = page.locator('.faq__list details').first();
  await faqItem.locator('summary').click();
  await expect(faqItem).toHaveAttribute('open', '');
  await expect(faqItem).toContainText('от 7 до 16 лет');

  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    )
    .toBe(true);

  if (testInfo.project.name === 'mobile') {
    const mobileMenu = page.locator('.site-header__mobile');
    await mobileMenu.locator('summary').click();
    await expect(mobileMenu).toHaveAttribute('open', '');
    await expect(mobileMenu.getByRole('navigation')).toBeVisible();
    await expect(mobileMenu.getByRole('link', { name: 'Подход' })).toHaveAttribute(
      'href',
      '#approach',
    );
    await mobileMenu.locator('summary').click();

    await page.locator('#approach').scrollIntoViewIfNeeded();
    const mobileCta = page.locator('[data-mobile-cta]');
    await expect(mobileCta).toBeVisible();
    await mobileCta.click();
    await expect(page.getByRole('dialog')).toBeVisible();
  } else {
    await expect(page.locator('[data-mobile-cta]')).toBeHidden();
  }
});

test('opens the contact dialog and restores trigger focus on Escape', async ({ page }) => {
  await page.goto('/');
  await declineAnalytics(page);

  const trigger = page.locator('[data-hero]').getByRole('link', {
    name: 'Обсудить ситуацию бесплатно',
  });
  await trigger.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('link', { name: 'Написать в Telegram' })).toHaveAttribute(
    'href',
    'https://t.me/ninixer',
  );

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('keeps essential mobile navigation and form constraints without JavaScript', async (
  { browser },
  testInfo,
) => {
  test.skip(testInfo.project.name !== 'mobile', 'The no-JavaScript contract runs in a mobile context.');

  const mobile = devices['iPhone 13'];
  const context = await browser.newContext({
    baseURL: process.env.E2E_BASE_URL,
    deviceScaleFactor: mobile.deviceScaleFactor,
    extraHTTPHeaders: { 'x-real-ip': '198.51.100.20' },
    hasTouch: mobile.hasTouch,
    isMobile: mobile.isMobile,
    javaScriptEnabled: false,
    userAgent: mobile.userAgent,
    viewport: mobile.viewport,
  });

  try {
    const page = await context.newPage();
    await page.goto('/');

    const faqItem = page.locator('.faq__list details').first();
    await faqItem.locator('summary').click();
    await expect(faqItem).toHaveAttribute('open', '');
    await expect(faqItem).toContainText('от 7 до 16 лет');

    await expect(page.locator('[data-open-cookie-settings]')).toBeHidden();
    const form = page.locator('[data-contact-form]');
    await expect(form.getByLabel('Ваше имя')).toHaveAttribute('required', '');
    await expect(form.getByLabel('Ваше имя')).toHaveAttribute('minlength', '2');
    await expect(form.getByLabel('Коротко о ситуации')).toHaveAttribute('maxlength', '1000');
    await expect(form.getByRole('checkbox')).toHaveAttribute('required', '');
    await expect(form.locator('[name="consentVersion"]')).toHaveValue('1.0');

    const heroCta = page.locator('[data-hero] [data-contact-trigger]');
    await expect(heroCta).toHaveAttribute('href', '#contact');
    await heroCta.click();
    await expect(page).toHaveURL(/#contact$/);
  } finally {
    await context.close();
  }
});
