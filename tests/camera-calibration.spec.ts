import { test, expect } from '@playwright/test';

test('camera calibration workflow works', async ({ page }) => {
  await page.goto('http://localhost:5173/');

  // Check if button is visible
  const calibrateBtn = page.locator('[data-testid="calibrate-floor-btn"]');
  await expect(calibrateBtn).toBeVisible();

  // Click it
  await calibrateBtn.click();

  // Check for calibrating state
  const calibratingStatus = page.locator('[data-testid="calibrating-status"]');
  await expect(calibratingStatus).toBeVisible();
  await expect(page.locator('text=Estimating floor plane...')).toBeVisible();

  // Wait for success
  const successStatus = page.locator('[data-testid="calibration-success"]');
  await expect(successStatus).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=Calibration Successful! Floor plane established.')).toBeVisible();

  // Simulate Bump
  const forceBumpBtn = page.locator('[data-testid="force-bump-btn"]');
  await expect(forceBumpBtn).toBeVisible();
  await forceBumpBtn.click();

  // Verify bumped state
  const bumpedStatus = page.locator('[data-testid="calibration-bumped"]');
  await expect(bumpedStatus).toBeVisible();
  await expect(page.locator('text=Calibration Error')).toBeVisible();
  await expect(page.locator('text=Camera movement detected! Metrics may be skewed. Please recalibrate.')).toBeVisible();

  // Recalibrate Now
  const recalibrateNowBtn = page.locator('[data-testid="recalibrate-alert-btn"]');
  await expect(recalibrateNowBtn).toBeVisible();
  await recalibrateNowBtn.click();

  // Verify it's back to idle
  await expect(calibrateBtn).toBeVisible();
});
