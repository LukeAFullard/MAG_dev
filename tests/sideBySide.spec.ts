import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Side-by-Side Comparison UI', () => {
    test('should render the side-by-side UI', async ({ page }) => {
        await page.goto('http://localhost:5173/');

        const comparisonTitle = page.locator('h2', { hasText: 'Side-by-Side Comparison' });
        await expect(comparisonTitle).toBeVisible();

        const video1Input = page.getByTestId('upload-video-1');
        await expect(video1Input).toBeVisible();

        const video2Input = page.getByTestId('upload-video-2');
        await expect(video2Input).toBeVisible();
    });
});
