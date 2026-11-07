import { defineConfig } from '@playwright/test';

/**
 * Phase 13 end-to-end suite.
 *
 * Uses the installed Microsoft Edge (or Chrome) channel so no browser binaries
 * are downloaded. Override with AQUATRACK_BROWSER=chrome when Edge is absent.
 *
 * Prerequisites:
 *   - PostgreSQL/Neon configured via server/.env
 *   - API on :5000 and Vite on :5173, or let webServer start them
 *
 * Run: npm run test:e2e
 */
const channel = process.env.AQUATRACK_BROWSER || 'msedge';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    channel,
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  webServer: [
    {
      command: 'npm.cmd run dev',
      cwd: '../server',
      url: 'http://localhost:5000/api/health',
      reuseExistingServer: true,
      timeout: 120_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'npm.cmd run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 120_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
});
