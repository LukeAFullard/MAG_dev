import { test, expect } from '@playwright/test';

test.describe('Auto Clip UI Test', () => {
  test('should display extracted clips when a video is uploaded', async ({ page }) => {
    test.setTimeout(180000); // Allow up to 3 minutes for ML processing in headless mode
    // Navigate to app
    await page.goto('http://localhost:5173/'); await page.click('text=Capture & Process');

    // Upload the sample video
    await page.getByTestId('upload-video-input').setInputFiles('public/test_clip.mp4');

    // The job item should appear
    const jobItem = page.getByTestId('job-item');
    await expect(jobItem).toBeVisible({ timeout: 10000 });

    // Verify Pass 1 completion message
    await expect(jobItem).toContainText('pass2', { timeout: 5000 });

    // Verify clips section is visible
    const clipsHeader = jobItem.locator('h5', { hasText: 'Extracted Clips' });
    await expect(clipsHeader).toBeVisible();

    // Wait for the pipeline to finish processing the actual video
    await expect(jobItem).toContainText('completed', { timeout: 150000 });

    // Verify the simulated clips are displayed correctly
    const clips = jobItem.getByTestId('extracted-clip');
    // We expect at least one clip from the test video
    await expect(clips).not.toHaveCount(0);

    const firstClip = clips.nth(0);
    // Since it's a real test clip now, category defaults to 'Floor'
    await expect(firstClip).toContainText('Floor');
  });
});
