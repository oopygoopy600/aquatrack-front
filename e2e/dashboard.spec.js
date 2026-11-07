import { expect, test } from '@playwright/test';
import { loginViaApi } from './helpers.js';

test('dashboard KPIs come from the expanded demo dataset', async ({ page }) => {
  await loginViaApi(page);
  await page.goto('/dashboard');

  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText('₱661,132', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/908 transactions/)).toBeVisible();
  await expect(page.getByText('80,761 gal', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('578', { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText('deterministic seeded dataset (80 customers, 908 sales, 180 days of history)')
  ).toBeVisible();
  await expect(page.getByText('Revenue trend')).toBeVisible();
  await expect(page.getByText('Payment mix')).toBeVisible();
  await expect(page.getByText('Stock alerts')).toBeVisible();
});
