import { test, expect } from '@playwright/test';

test.use({
  video: 'on',
});

test('db test', async ({ page }) => {
  await page.goto('http://localhost:5173/'); await page.click('text=Athletes');

  // Wait for the DB to be connected
  await expect(page.getByText('Connected')).toBeVisible({ timeout: 10000 });

  // Try adding a new athlete
  await page.fill('input[placeholder="Enter new athlete name..."]', 'John Doe');
  await page.click('button[type="submit"]');

  // Verify the new athlete was added to the list
  await expect(page.locator('ul')).toContainText('John Doe');

  await page.screenshot({ path: 'db_screenshot.png', fullPage: true });
});
