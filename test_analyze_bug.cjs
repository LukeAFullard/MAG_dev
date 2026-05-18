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

  console.log('Waiting for model to load...');
  await page.waitForFunction(() => {
    const text = document.body.innerText;
    return text.includes('✓ Ready') || text.includes('Ready');
  }, { timeout: 60000 });
  console.log('Model loaded.');

  // Set mode to analyzing by mocking the state
  await page.evaluate(() => {
     // Wait for react to bind elements, grab an element inside the InstantHMR viewer
     const uploadBtn = [...document.querySelectorAll('button')].find(b => b.innerText.includes('Upload Video'));
     if (uploadBtn) uploadBtn.click();
  });

  const fileInput = await page.$('input[type="file"]');
  // Upload test clip
  await fileInput.setInputFiles(path.resolve('public/test_clip.mp4'));

  // Wait for the button Analyze Video to appear
  await page.waitForFunction(() => {
      const b = [...document.querySelectorAll('button')].find(btn => btn.innerText.includes('Analyze Video'));
      return !!b;
  });

  await page.evaluate(() => {
     const b = [...document.querySelectorAll('button')].find(btn => btn.innerText.includes('Analyze Video'));
     if (b) {
         console.log("Found Analyze Video button, clicking it");
         b.click();
     }
  });

  await page.waitForTimeout(5000);
  await browser.close();
})();
