import { test, expect } from '@playwright/test';

test('capture guidelines appear when button is clicked', async ({ page }) => {
  await page.goto('http://localhost:5173/');

  // Check if button is visible
  const openButton = page.locator('[data-testid="capture-guidelines-btn"]');
  await expect(openButton).toBeVisible();

  // Click it
  await openButton.click();

  // Check if modal appears
  const modalHeading = page.locator('h2', { hasText: 'Optimal Capture Guidelines' });
  await expect(modalHeading).toBeVisible();

  // Verify content
  await expect(page.locator('text=Tripod Use is Essential')).toBeVisible();
  await expect(page.locator('text=Side-Angle Capture')).toBeVisible();

  // Take a screenshot
  await page.screenshot({ path: 'capture-guidelines-screenshot.png' });

  // Close the modal
  const closeButton = page.locator('[data-testid="close-guidelines-btn"]');
  await expect(closeButton).toBeVisible();
  await closeButton.click();

  // Verify modal is closed
  await expect(modalHeading).not.toBeVisible();
});
