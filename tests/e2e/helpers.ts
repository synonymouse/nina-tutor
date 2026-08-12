import { expect, type Page } from '@playwright/test';

export async function declineAnalytics(page: Page): Promise<void> {
  const declineButton = page.getByRole('button', { name: 'Не разрешать' });
  await expect(declineButton).toBeVisible();
  await declineButton.click();
  await expect(declineButton).toBeHidden();
}
