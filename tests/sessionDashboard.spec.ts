import { test, expect } from '@playwright/test';

test.describe('Session Analytics Dashboard', () => {
  test('renders dashboard and allows interacting with athlete selection', async ({ page }) => {
    await page.goto('/');

    // Wait for DB to be connected
    await expect(page.getByText('DB Status:')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Connected')).toBeVisible({ timeout: 10000 });

    // Check if Dashboard header is visible
    await expect(page.getByText('Session Analytics Dashboard')).toBeVisible();

    // The name to use for this run to avoid conflicts
    const athleteName = `Dashboard Test Athlete ${Date.now()}`;

    await page.getByPlaceholder('Enter new athlete name...').fill(athleteName);
    await page.getByRole('button', { name: 'Add Athlete' }).click();

    // Verify athlete is in the select dropdown
    const select = page.getByTestId('athlete-select');
    await expect(select).toBeVisible();

    // Wait for the option to be available in the DOM
    await expect(select.locator(`option:has-text("${athleteName}")`)).toBeAttached();

    // Select the athlete we just created
    await select.selectOption({ label: athleteName });

    // Verify overview section shows the athlete name (it's now an h3)
    await expect(page.getByRole('heading', { name: athleteName })).toBeVisible();

    // Verify it says "No sessions found." initially
    await expect(page.getByText('No sessions found.')).toBeVisible();

    // Check that Predictive Analytics requires at least 5 attempts to show up (it should be hidden initially)
    await expect(page.getByTestId('predictive-analytics')).toBeHidden();
  });
});
