import { expect, test } from '@playwright/test';
import { loginViaApi } from './helpers.js';

const PAGES = [
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

test('every module renders live data for an administrator', async ({ page }) => {
  await loginViaApi(page);

  for (const entry of PAGES) {
    await test.step(entry.path, async () => {
      await page.goto(entry.path);
      await expect(
        page.getByRole('heading', { level: 1, name: entry.heading })
      ).toBeVisible();
      await expect(page.getByText(entry.anchor, { exact: false }).first()).toBeVisible();
      await expect(page.getByText('Cannot reach the API')).toHaveCount(0);
    });
  }

  await expect(page.locator('aside')).toBeVisible();
});
