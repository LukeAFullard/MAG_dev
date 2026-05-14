import { test, expect } from '@playwright/test';

test.describe('Auto Clip UI Test', () => {
  test('should display extracted clips when simulation button is clicked', async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:5173/');

    // Click the simulate button
    await page.getByTestId('simulate-video-btn').click();

    // The job item should appear
    const jobItem = page.getByTestId('job-item');
    await expect(jobItem).toBeVisible();

    // Verify Pass 1 completion message
    await expect(jobItem).toContainText('Running Pass 2', { timeout: 5000 });

    // Verify clips section is visible
    const clipsHeader = jobItem.locator('h4', { hasText: 'Extracted Clips' });
    await expect(clipsHeader).toBeVisible();

    // Verify the simulated clips are displayed correctly
    const clips = jobItem.getByTestId('extracted-clip');
    await expect(clips).toHaveCount(2);

    const firstClip = clips.nth(0);
    await expect(firstClip).toContainText('Vault');
    await expect(firstClip).toContainText('[1.5s - 3.2s]');

    const secondClip = clips.nth(1);
    await expect(secondClip).toContainText('Floor');
    await expect(secondClip).toContainText('[5s - 7.8s]');
  });
});
