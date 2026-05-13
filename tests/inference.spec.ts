import { test, expect } from '@playwright/test';

test('Inference Engine loads properly', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  await expect(page).toHaveTitle(/MAG_dev/);

  // Wait for the UI to update with "Ready" status from Inference Engine
  const inferenceStatus = page.locator('span', { hasText: /Ready \(.*?\)/ });
  await expect(inferenceStatus).toBeVisible({ timeout: 10000 });

  // Optionally capture screenshot
  await page.screenshot({ path: 'inference_screenshot.png', fullPage: true });
});
