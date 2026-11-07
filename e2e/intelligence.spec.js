import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { loginViaApi } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await loginViaApi(page);
});

test('analytics loads all-time totals and re-queries a 30-day window', async ({ page }) => {
  await page.goto('/analytics');
  await expect(page.getByRole('heading', { level: 1, name: 'Business analytics' })).toBeVisible();
  await expect(page.getByText('₱661,132', { exact: true }).first()).toBeVisible();

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/analytics/descriptive') && response.url().includes('days=30')
  );
  await page.getByRole('button', { name: 'Last 30 days' }).click();
  const response = await responsePromise;

  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.data.range.days).toBe(30);
  expect(body.data.totals.transactions).toBeGreaterThan(0);
  expect(body.data.totals.transactions).toBeLessThan(908);
  await expect(page.getByText('Revenue and water demand')).toBeVisible();
});

test('forecasting switches horizon and exposes measured accuracy', async ({ page }) => {
  await page.goto('/forecasting');
  await expect(page.getByRole('heading', { level: 1, name: 'Demand forecasting' })).toBeVisible();
  await expect(page.getByText('Model accuracy')).toBeVisible();
  await expect(page.getByText('WAPE', { exact: true })).toBeVisible();
  await expect(page.getByText('2,539 gal', { exact: true })).toBeVisible();

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/forecast') && response.url().includes('horizon=14')
  );
  await page.getByRole('button', { name: 'Next 14 days' }).click();
  const response = await responsePromise;

  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.data.forecast).toHaveLength(14);
  await expect(page.getByText('Forecast demand · 14 days')).toBeVisible();
  await expect(page.getByText('Horizon 14 days')).toBeVisible();
  await expect(page.getByText('Actual demand and forecast')).toBeVisible();
});

test('recommendations filter by priority and category', async ({ page }) => {
  await page.goto('/recommendations');
  await expect(page.getByRole('heading', { level: 1, name: 'Recommendations' })).toBeVisible();

  const showing = page.getByText(/^Showing \d+ of \d+ actions$/);
  await expect(showing).toBeVisible();
  const total = Number((await showing.textContent()).match(/of (\d+)/)[1]);
  expect(total).toBeGreaterThanOrEqual(8);
  await expect(page.getByText('Stock health & reorder check')).toBeVisible();

  await page.getByRole('tab', { name: /Critical/ }).click();
  await expect(page.getByText(`Showing 1 of ${total} actions`)).toBeVisible();

  await page.locator('#recommendation-category').selectOption('Customer');
  await expect(page.getByText('No actions match these filters')).toBeVisible();

  await page.locator('#recommendation-category').selectOption('all');
  await expect(page.getByText(`Showing 1 of ${total} actions`)).toBeVisible();

  await page.getByRole('tab', { name: /^All/ }).click();
  await expect(page.getByText(`Showing ${total} of ${total} actions`)).toBeVisible();
});

test('delivery optimization switches windows and keeps totals reconciled', async ({ page }) => {
  await page.goto('/delivery-optimization');
  await expect(page.getByRole('heading', { level: 1, name: 'Routes, costs & timing' })).toBeVisible();
  await expect(page.getByText('Delivery economics by zone')).toBeVisible();
  await expect(page.getByText('₱586', { exact: true })).toBeVisible();
  await expect(page.getByText('24.5%', { exact: true })).toBeVisible();

  const allTimePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/delivery-optimization') && !response.url().includes('days=')
  );
  await page.getByRole('tab', { name: 'All time' }).click();
  const allTimeResponse = await allTimePromise;
  expect(allTimeResponse.status()).toBe(200);
  const allTime = await allTimeResponse.json();
  expect(allTime.data.summary.delivered).toBe(578);
  await expect(page.getByText('All recorded deliveries')).toBeVisible();

  const thirtyDayPromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/delivery-optimization') && response.url().includes('days=30')
  );
  await page.getByRole('tab', { name: '30 days' }).click();
  const thirtyDayResponse = await thirtyDayPromise;
  const thirtyDay = await thirtyDayResponse.json();
  expect(thirtyDay.data.summary.delivered).toBeGreaterThan(0);
  expect(thirtyDay.data.summary.delivered).toBeLessThan(578);
});

test('reports switch periods and download a labelled CSV', async ({ page }) => {
  await page.goto('/reports');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Printable operations reports' })
  ).toBeVisible();
  await expect(page.getByText('Sales and payments')).toBeVisible();
  await expect(page.getByText('₱3,024', { exact: true }).first()).toBeVisible();

  const monthPromise = page.waitForResponse(
    (response) => response.url().includes('/api/reports') && response.url().includes('period=month')
  );
  await page.getByRole('tab', { name: 'Month to date' }).click();
  const monthResponse = await monthPromise;
  expect(monthResponse.status()).toBe(200);
  const month = await monthResponse.json();
  expect(month.data.range.period).toBe('month');
  expect(month.data.range.days).toBeGreaterThanOrEqual(1);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'CSV' }).first().click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.csv$/i);

  const filePath = await download.path();
  const csv = fs.readFileSync(filePath, 'utf8');
  expect(csv).toContain('Simulated demo data');
  expect(csv.split(/\r?\n/).filter(Boolean).length).toBeGreaterThan(1);

  const previousPromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/reports') && response.url().includes('period=prev-month')
  );
  await page.getByRole('tab', { name: 'Previous month' }).click();
  const previousResponse = await previousPromise;
  const previous = await previousResponse.json();
  expect(previous.data.range.period).toBe('prev-month');
  expect(previous.data.range.days).toBeGreaterThanOrEqual(28);
});
