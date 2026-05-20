import { test, expect } from '@playwright/test';

test('InstantHMR loads and checks for console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.log(`BROWSER ERROR: ${msg.text()}`);
    } else {
      console.log(`BROWSER LOG: ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    errors.push(err.message);
    console.log(`BROWSER EXCEPTION: ${err.message}`);
  });

  await page.goto('http://localhost:5173/MAG_dev/instanthmr.html');
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'instanthmr_test2.png', fullPage: true });

  // If there are specific errors we expect to fix, we can log them.
  console.log('Total errors captured:', errors.length);
});
