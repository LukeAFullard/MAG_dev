const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('http://localhost:5173/MAG_dev/instanthmr.html');
  await page.waitForLoadState('networkidle');

  await page.waitForFunction(() => {
    const text = document.body.innerText;
    return text.includes('✓ Ready') || text.includes('Ready');
  }, { timeout: 60000 });

  await page.evaluate(() => {
     const uploadBtn = [...document.querySelectorAll('button')].find(b => b.innerText.includes('Upload Video'));
     if (uploadBtn) uploadBtn.click();
  });

  const fileInput = await page.$('input[type="file"]');
  await fileInput.setInputFiles(path.resolve('public/test_clip.mp4'));

  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'verify_state.png' });
  await browser.close();
})();
