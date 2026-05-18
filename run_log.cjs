const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER:', msg.text()));

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

  await page.waitForTimeout(1000);

  await page.evaluate(() => {
     const analyzeBtn = [...document.querySelectorAll('button')].find(b => b.innerText.includes('Analyze Video'));
     if (analyzeBtn) {
         analyzeBtn.click();
     }
  });

  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'after_analyze_click.png' });
  await browser.close();
})();
