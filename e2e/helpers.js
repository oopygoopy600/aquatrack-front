import { expect } from '@playwright/test';

export const ACCOUNTS = {
  admin: {
    identifier: 'admin',
    password: 'Admin@123',
    fullName: 'AquaTrack Administrator',
  },
  staff: {
    identifier: 'staff',
    password: 'Staff@123',
    fullName: 'AquaTrack Staff',
  },
};

/**
 * Signs in through the real API and seeds the browser storage that AuthContext
 * reads on boot. Auth-specific behaviour is still covered by the login UI test.
 */
export async function loginViaApi(page, role = 'admin') {
  const account = ACCOUNTS[role];
  const response = await page.request.post('/api/auth/login', {
    data: { identifier: account.identifier, password: account.password },
  });
  expect(response.ok(), `login API failed with ${response.status()}`).toBeTruthy();

  const payload = await response.json();
  const { token, user } = payload.data;

  await page.addInitScript(
    ({ nextToken, nextUser }) => {
      localStorage.setItem('aquatrack_token', nextToken);
      localStorage.setItem('aquatrack_user', JSON.stringify(nextUser));
    },
    { nextToken: token, nextUser: user }
  );

  return { ...payload.data, token };
}

export function uniqueName(prefix) {
  return `${prefix} ${Date.now().toString(36)}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

export function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Records uncaught page errors and console errors for a test. */
export function collectPageErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (/favicon|Download the React DevTools/i.test(text)) return;
    errors.push(`console: ${text}`);
  });
  return errors;
}

export async function expectNoHorizontalOverflow(page, label = 'page') {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(
    dimensions.scrollWidth,
    `${label} overflows horizontally: ${dimensions.scrollWidth}px content in ${dimensions.viewportWidth}px viewport`
  ).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
}
