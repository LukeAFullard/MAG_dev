import { test, expect } from '@playwright/test';

test.describe('Video Processing Pipeline', () => {
  test('should simulate video processing workflow and show extracted clips', async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:5173/'); await page.click('text=Capture & Process');

    // Wait for initial render
    await expect(page.locator('h1')).toContainText('MAG_dev');

    // Check that New Video Analysis section exists
    await expect(page.locator('h2', { hasText: 'New Video Analysis' })).toBeVisible();

    // Upload the sample video
    await page.getByTestId('upload-video-input').setInputFiles('public/test_clip.mp4');

    const jobItem = page.getByTestId('job-item');
    await expect(jobItem).toBeVisible();

    // Verify it passes through or reaches Pass 2/Pass 3 or completion
    await expect(jobItem).toContainText(/Running Pass|Processing Complete/);

    // Verify extracted clips are displayed (it processes a real video now)
    const clip = page.getByTestId('extracted-clip').first();
    await expect(clip).toBeVisible();
    await expect(clip).toContainText('Floor'); // Default apparatus category

    // Wait for completion
    await expect(jobItem).toContainText('Processing Complete', { timeout: 30000 });
  });
});
