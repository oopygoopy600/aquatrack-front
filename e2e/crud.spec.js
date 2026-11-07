import { expect, test } from '@playwright/test';
import { escapeRegExp, loginViaApi, uniqueName } from './helpers.js';

test('admin can create and delete a disposable product', async ({ page }) => {
  const auth = await loginViaApi(page);
  const headers = { Authorization: `Bearer ${auth.token}` };
  const name = uniqueName('E2E Product');

  try {
    await page.goto('/products');
    await expect(page.getByText('Product catalogue')).toBeVisible();
    await page.getByRole('button', { name: 'Add product' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Add product' })).toBeVisible();
    await dialog.locator('#product_name').fill(name);
    await dialog.locator('#water_type').selectOption('Purified');
    await dialog.locator('#container_capacity').fill('5');
    await dialog.locator('#selling_price').fill('25');
    await dialog.locator('#unit_cost').fill('7');
    await dialog.locator('#reorder_level').fill('2');
    await dialog.locator('#initial_stock').fill('5');
    await dialog.getByRole('button', { name: 'Create product' }).click();

    await expect(page.getByText('Product created with inventory')).toBeVisible();
    await expect(dialog).toHaveCount(0);

    await page.getByPlaceholder('Search product name…').fill(name);
    const row = page.getByRole('row', { name: new RegExp(escapeRegExp(name)) });
    await expect(row).toBeVisible();
    await expect(row.getByText(name, { exact: true })).toBeVisible();
    await expect(row.getByText('Healthy', { exact: true })).toBeVisible();

    await row.getByRole('button', { name: `Delete ${name}`, exact: true }).click();
    const confirm = page.getByRole('dialog');
    await expect(confirm.getByRole('heading', { name: 'Delete this product?' })).toBeVisible();
    await confirm.getByRole('button', { name: 'Delete product' }).click();

    await expect(page.getByText('Product deleted.', { exact: true })).toBeVisible();
    await expect(page.getByText('No products found')).toBeVisible();
  } finally {
    const lookup = await page.request.get(
      `/api/products?search=${encodeURIComponent(name)}&status=all&limit=100`,
      { headers }
    );
    if (lookup.ok()) {
      const payload = await lookup.json();
      for (const product of payload.data || []) {
        await page.request.delete(`/api/products/${product.product_id}`, { headers });
      }
    }
  }
});

test('admin can create and delete a disposable expense', async ({ page }) => {
  const auth = await loginViaApi(page);
  const headers = { Authorization: `Bearer ${auth.token}` };
  const description = uniqueName('E2E Supplies');

  try {
    await page.goto('/expenses');
    await expect(page.getByText('Expense register')).toBeVisible();
    await page.getByRole('button', { name: 'Add expense' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Add expense' })).toBeVisible();
    await dialog.locator('#expense_category').selectOption('Supplies');
    await dialog.locator('#expense_amount').fill('12.34');
    await dialog.locator('#expense_description').fill(description);
    await dialog.getByRole('button', { name: 'Record expense' }).click();

    await expect(page.getByText('Expense recorded')).toBeVisible();
    await expect(dialog).toHaveCount(0);

    await page.getByPlaceholder('Search description…').fill(description);
    const row = page.getByRole('row', { name: new RegExp(escapeRegExp(description)) });
    await expect(row).toBeVisible();

    await row.getByRole('button', { name: /Delete expense/ }).click();
    const confirm = page.getByRole('dialog');
    await expect(confirm.getByRole('heading', { name: 'Delete this expense?' })).toBeVisible();
    await confirm.getByRole('button', { name: 'Delete expense' }).click();

    await expect(page.getByText('Expense deleted', { exact: true })).toBeVisible();
    await expect(page.getByText('No expenses found')).toBeVisible();
  } finally {
    const lookup = await page.request.get(
      `/api/expenses?search=${encodeURIComponent(description)}&limit=100`,
      { headers }
    );
    if (lookup.ok()) {
      const payload = await lookup.json();
      for (const expense of payload.data || []) {
        await page.request.delete(`/api/expenses/${expense.expense_id}`, { headers });
      }
    }
  }
});
