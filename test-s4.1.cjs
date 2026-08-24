const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = path.join(__dirname, 'artifacts/simple-editor/s4.1');
const TEST_IMG_DIR = path.join(__dirname, 'test-images');

async function testS41() {
  console.log("Starting S4.1 test...");
  if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  
  const results = { errors: [], pageErrors: [], failedRequests: [] };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') results.errors.push(msg.text());
  });
  page.on('pageerror', err => results.pageErrors.push(err.message));

  await page.goto('http://localhost:8080/template-builder.html', { waitUntil: 'networkidle' });

  // 1. Upload Banner
  console.log("Uploading banner...");
  let [fcBanner] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.evaluate(() => document.getElementById('btn-upload-banner').click())
  ]);
  // Re-create a banner image if it's not there, but test-images/test-banner.jpg should exist from S4
  if (!fs.existsSync(path.join(TEST_IMG_DIR, 'test-banner.jpg'))) {
     const base64Pixel = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
     if (!fs.existsSync(TEST_IMG_DIR)) fs.mkdirSync(TEST_IMG_DIR);
     fs.writeFileSync(path.join(TEST_IMG_DIR, 'test-banner.jpg'), Buffer.from(base64Pixel, 'base64'));
  }
  await fcBanner.setFiles(path.join(TEST_IMG_DIR, 'test-banner.jpg'));
  await page.waitForTimeout(1000);
  
  // 2. Test Fusion Presets at 100% Strength to see the difference clearly
  console.log("Testing fusion presets...");
  await page.evaluate(() => {
    const range = document.getElementById('range-banner-fusion');
    range.value = 100;
    window.updateBannerSettings();
  });
  
  await page.evaluate(() => window.setBannerFusion('none'));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'fusion-none.png') });

  await page.evaluate(() => window.setBannerFusion('soft'));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'fusion-soft.png') });
  
  await page.evaluate(() => window.setBannerFusion('medium'));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'fusion-medium.png') });
  
  await page.evaluate(() => window.setBannerFusion('deep'));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'fusion-intense.png') });
  
  // 3. Test Strength Values (at 'deep' preset)
  console.log("Testing fusion strengths...");
  await page.evaluate(() => {
    const range = document.getElementById('range-banner-fusion');
    range.value = 0;
    window.updateBannerSettings();
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'fusion-strength-low.png') });

  await page.evaluate(() => {
    const range = document.getElementById('range-banner-fusion');
    range.value = 100;
    window.updateBannerSettings();
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'fusion-strength-high.png') });
  
  // 4. Viewports
  console.log("Testing mobile viewport...");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'fusion-mobile-390.png') });

  await browser.close();

  fs.writeFileSync(path.join(ARTIFACT_DIR, 'playwright-results.json'), JSON.stringify(results, null, 2));
  console.log('Test completed.');
}

testS41().catch(console.error);
