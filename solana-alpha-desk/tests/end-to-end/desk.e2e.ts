import { expect, test } from '@playwright/test';

const EMAIL = 'owner@example.com';
const PASSWORD = 'correct horse battery staple';

test.describe.configure({ mode: 'serial' });

test('first-run setup, sign-in, every page, owner controls and the breaker reset procedure', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('/');
  await expect(page.getByText('First-run owner setup')).toBeVisible();
  await page.getByLabel('Setup token').fill('e2e-setup-token-0123456789abcdef');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel(/^Password/).fill(PASSWORD);
  await page.getByRole('button', { name: 'Create owner and sign in' }).click();
  await expect(page.getByText('Candidate funnel · last 24h')).toBeVisible();
  await expect(page.getByText('PAPER', { exact: true }).first()).toBeVisible();

  const pages: Array<[string, string]> = [
    ['Discover', 'No candidates match'],
    ['Opportunities', 'Ranked opportunities'],
    ['Token Intelligence', 'Look up a token'],
    ['Paper Trading', 'Session controls'],
    ['Portfolio', 'Ledger balances (double entry)'],
    ['Risk Center', 'Circuit breakers'],
    ['Journal', 'No paper trades yet'],
    ['Analytics', 'Paper-trading validation'],
    ['Reports', 'Generate a report now'],
    ['Agents', 'nothing here is animated or simulated'],
    ['System Health', 'Data providers'],
    ['Settings', 'Schedule and budgets'],
  ];
  for (const [nav, text] of pages) {
    await page.getByRole('link', { name: nav, exact: true }).click();
    await expect(page.getByText(text).first()).toBeVisible();
  }

  // Owner control with confirmation: switch to manual paper trading.
  await page.getByRole('link', { name: 'Paper Trading', exact: true }).click();
  await page.getByRole('button', { name: /PAPER MANUAL/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click();
  await expect(page.locator('header').getByText('PAPER MANUAL')).toBeVisible();

  // Emergency pause trips the breaker; leaving it needs the typed reset phrase.
  await page.getByRole('button', { name: 'Emergency pause' }).click();
  await page.getByRole('dialog').getByRole('textbox').first().fill('end-to-end drill of the pause');
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click();
  await expect(page.locator('header').getByText('EMERGENCY PAUSED')).toBeVisible();
  await page.getByRole('link', { name: 'Risk Center', exact: true }).click();
  await expect(page.getByText('TRIPPED').first()).toBeVisible();
  await page.getByRole('button', { name: 'Reset…' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox').first().fill('drill complete, all clear');
  await dialog.getByRole('textbox').nth(1).fill('RESET EMERGENCY_PAUSE');
  await dialog.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByText('all clear')).toBeVisible();

  // Reports are generated on demand with a paper disclaimer.
  await page.getByRole('link', { name: 'Reports', exact: true }).click();
  await page.getByRole('button', { name: 'REJECTION FUNNEL' }).click();
  await expect(page.getByText(/Paper trading only/).first()).toBeVisible();

  // Audit log records the administrative actions.
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await page.getByRole('tab', { name: 'Audit log' }).click();
  await expect(page.getByText('MODE_CHANGED').first()).toBeVisible();

  // Mobile layout: no horizontal page scroll.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('link', { name: 'Overview', exact: true }).click();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  expect(errors).toEqual([]);
});

test('private API refuses unauthenticated access', async ({ request }) => {
  for (const path of ['/api/v1/overview', '/api/v1/candidates', '/api/v1/risk', '/api/v1/settings']) {
    expect((await request.get(path)).status()).toBe(401);
  }
  expect(
    (
      await request.post('/api/v1/control/mode', { data: { mode: 'PAPER_AUTONOMOUS', reason: 'x' } })
    ).status(),
  ).toBe(401);
  expect((await request.post('/internal/v1/sql', { data: '{}' })).status()).toBe(503);
});
