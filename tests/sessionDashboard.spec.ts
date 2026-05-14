import { test, expect } from '@playwright/test';

test.describe('Session Analytics Dashboard', () => {
  test('renders dashboard and allows interacting with athlete selection', async ({ page }) => {
    await page.goto('/');

    // Wait for DB to be connected
    await expect(page.getByText('DB Status: Connected')).toBeVisible({ timeout: 10000 });

    // Check if Dashboard header is visible
    await expect(page.getByText('Session Analytics Dashboard')).toBeVisible();

    // The name to use for this run to avoid conflicts
    const athleteName = `Dashboard Test Athlete ${Date.now()}`;

    await page.getByPlaceholder('New Athlete Name').fill(athleteName);
    await page.getByRole('button', { name: 'Add Athlete' }).click();

    // Verify athlete is in the select dropdown
    const select = page.getByTestId('athlete-select');
    await expect(select).toBeVisible();

    // Wait for the option to be available in the DOM (it might not be "visible" directly in playwright's eyes if dropdown is closed)
    await expect(select.locator(`option:has-text("${athleteName}")`)).toBeAttached();

    // Select the athlete we just created
    await select.selectOption({ label: athleteName });

    // Verify overview section shows the athlete name
    await expect(page.getByText(`Overview: ${athleteName}`)).toBeVisible();

    // Verify it says "No sessions found." initially
    await expect(page.getByText('No sessions found.')).toBeVisible();

    // Check chart container message
    await expect(page.getByText('No recent attempts data for chart.')).toBeVisible();
  });
});
