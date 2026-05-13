import { test, expect } from '@playwright/test';

test.use({
  video: 'on',
});

test('db test', async ({ page }) => {
  await page.goto('http://localhost:5173/');

  // Wait for the DB to be connected
  await expect(page.locator('span.font-mono').first()).toContainText('Connected', { timeout: 10000 });

  // Try adding a new athlete
  await page.fill('input[placeholder="New Athlete Name"]', 'John Doe');
  await page.click('button[type="submit"]');

  // Verify the new athlete was added to the list
  await expect(page.locator('ul.list-disc')).toContainText('John Doe');

  await page.screenshot({ path: 'db_screenshot.png', fullPage: true });
});
