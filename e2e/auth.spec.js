import { expect, test } from '@playwright/test';
import { loginViaApi } from './helpers.js';

test.describe('Authentication and access control', () => {
  test('redirects guests to login, rejects a bad password and signs in', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

    await page.locator('#identifier').fill('admin');
    await page.locator('#password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in to dashboard' }).click();

    await expect(page.getByRole('alert')).toContainText('Invalid username/email or password');

    await page.locator('#password').fill('Admin@123');
    await page.getByRole('button', { name: 'Sign in to dashboard' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Total revenue')).toBeVisible();
  });

  test('demo account shortcut fills credentials and sign out clears the session', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Admin admin/ }).click();
    await expect(page.locator('#identifier')).toHaveValue('admin');
    await expect(page.locator('#password')).toHaveValue('Admin@123');

    await page.getByRole('button', { name: 'Sign in to dashboard' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();

    await page.locator('header button[aria-haspopup="menu"]').click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();

    await expect(page).toHaveURL(/\/login$/);
    const storage = await page.evaluate(() => ({
      token: localStorage.getItem('aquatrack_token'),
      user: localStorage.getItem('aquatrack_user'),
    }));
    expect(storage).toEqual({ token: null, user: null });
  });

  test('a stale token is cleared before a protected page can render', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('aquatrack_token', 'expired.or.invalid.token');
      localStorage.setItem(
        'aquatrack_user',
        JSON.stringify({ user_id: 1, full_name: 'Stale User', role: 'admin' })
      );
    });

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('aquatrack_token'))).toBeNull();
  });

  test('staff see read-only management controls and can read analytics', async ({ page }) => {
    await loginViaApi(page, 'staff');

    await page.goto('/products');
    await expect(page.getByRole('heading', { level: 1, name: 'Products' })).toBeVisible();
    await expect(page.getByText('Staff view only', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add product' })).toHaveCount(0);

    await page.goto('/expenses');
    await expect(page.getByText('Expense register')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add expense' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Delete expense/ })).toHaveCount(0);

    await page.goto('/analytics');
    await expect(page.getByRole('heading', { level: 1, name: 'Business analytics' })).toBeVisible();
    await expect(page.getByText('Revenue and water demand')).toBeVisible();
  });
});
