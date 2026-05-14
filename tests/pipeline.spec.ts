import { test, expect } from '@playwright/test';

test.describe('Video Processing Pipeline', () => {
  test('should simulate video processing workflow and show extracted clips', async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:5173/');

    // Wait for initial render
    await expect(page.locator('h1')).toContainText('MAG_dev');

    // Check that Pipeline Simulator section exists
    await expect(page.locator('h2', { hasText: 'Pipeline Simulator' })).toBeVisible();

    // Click the simulate button
    await page.getByTestId('simulate-video-btn').click();

    const jobItem = page.getByTestId('job-item');
    await expect(jobItem).toBeVisible();

    // Verify it passes through Pass 2 (since pass 1 might be too fast to catch)
    await expect(jobItem).toContainText('Running Pass 2');

    // Verify extracted clips are displayed (simulation mode injects these)
    const clip = page.getByTestId('extracted-clip').first();
    await expect(clip).toBeVisible();
    await expect(clip).toContainText('Vault');
    await expect(clip).toContainText('[1.5s - 3.2s]');

    // Wait for completion
    await expect(jobItem).toContainText('Processing Complete', { timeout: 10000 });
  });
});
