import { test, expect } from '@playwright/test';

test.use({
  video: 'on',
});

test('basic test', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  await expect(page).toHaveTitle(/MAG_dev/);
  await expect(page.locator('h1')).toContainText('MAG_dev: Gymnastics Analysis');
  await page.screenshot({ path: 'screenshot.png', fullPage: true });
});
