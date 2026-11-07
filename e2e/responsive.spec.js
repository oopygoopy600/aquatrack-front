import { expect, test } from '@playwright/test';
import { collectPageErrors, expectNoHorizontalOverflow, loginViaApi } from './helpers.js';

const MOBILE_ROUTES = [
  { path: '/dashboard', heading: 'Dashboard', anchor: 'Total revenue' },
  { path: '/customers', heading: 'Customers', anchor: 'Customer directory' },
  { path: '/products', heading: 'Products', anchor: 'Product catalogue' },
  { path: '/sales', heading: 'Sales', anchor: 'Sales ledger' },
  { path: '/inventory', heading: 'Inventory', anchor: 'Filled containers' },
  { path: '/deliveries', heading: 'Deliveries', anchor: 'Delivery register' },
  { path: '/expenses', heading: 'Expenses', anchor: 'Expense register' },
  { path: '/analytics', heading: 'Business analytics', anchor: 'Revenue and water demand' },
  { path: '/forecasting', heading: 'Demand forecasting', anchor: 'Actual demand and forecast' },
  { path: '/recommendations', heading: 'Recommendations', anchor: 'Stock health & reorder check' },
  {
    path: '/delivery-optimization',
    heading: 'Routes, costs & timing',
    anchor: 'Delivery economics by zone',
  },
  { path: '/reports', heading: 'Printable operations reports', anchor: 'Sales and payments' },
];

test.describe('mobile layout at 320px', () => {
  test.use({ viewport: { width: 320, height: 800 } });

  test('no module overflows the page width or logs an error', async ({ page }) => {
    await loginViaApi(page);
    const errors = collectPageErrors(page);

    for (const entry of MOBILE_ROUTES) {
      await test.step(entry.path, async () => {
        await page.goto(entry.path);
        await expect(
          page.getByRole('heading', { level: 1, name: entry.heading })
        ).toBeVisible();
        await expect(page.getByText(entry.anchor, { exact: false }).first()).toBeVisible();
        await expectNoHorizontalOverflow(page, entry.path);
      });
    }

    expect(errors).toEqual([]);
  });

  test('the off-canvas navigation opens, navigates and closes', async ({ page }) => {
    await loginViaApi(page);
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();

    const aside = page.locator('aside');
    const isOpen = () =>
      aside.evaluate((element) => element.classList.contains('translate-x-0'));

    expect(await isOpen()).toBe(false);
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await expect.poll(isOpen).toBe(true);

    await aside.getByRole('link', { name: 'Customers' }).click();
    await expect(page).toHaveURL(/\/customers$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Customers' })).toBeVisible();
    await expect.poll(isOpen).toBe(false);
  });
});

test.describe('desktop layout at 1440px', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('persistent sidebar and intelligence pages fit the viewport', async ({ page }) => {
    await loginViaApi(page);
    const errors = collectPageErrors(page);

    await page.goto('/dashboard');
    await expect(page.locator('aside')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
    await expectNoHorizontalOverflow(page, '/dashboard');

    for (const path of [
      '/analytics',
      '/forecasting',
      '/recommendations',
      '/delivery-optimization',
      '/reports',
    ]) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await expectNoHorizontalOverflow(page, path);
    }

    expect(errors).toEqual([]);
  });
});
