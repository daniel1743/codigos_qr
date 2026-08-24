const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = path.join(__dirname, 'artifacts/simple-editor/s4');
const TEST_IMG_DIR = path.join(__dirname, 'test-images');

async function testS4() {
  console.log("Starting S4 test...");
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
  await fcBanner.setFiles(path.join(TEST_IMG_DIR, 'test-banner.jpg'));
  await page.waitForTimeout(1000);
  
  // Wait to capture the Default Banner state
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'banner-default.png') });
  
  // 2. Fusion Presets
  console.log("Testing fusion presets...");
  await page.evaluate(() => window.setBannerFusion('soft'));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'banner-soft-fusion.png') });
  
  await page.evaluate(() => window.setBannerFusion('medium'));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'banner-medium-fusion.png') });
  
  await page.evaluate(() => window.setBannerFusion('deep'));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'banner-deep-fusion.png') });
  
  // 3. Viewports
  console.log("Testing mobile viewport...");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'banner-mobile-390.png') });
  
  console.log("Testing desktop viewport...");
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.evaluate(() => {
    // switch to desktop preview inside the app if needed
    const btn = document.getElementById('view-desktop');
    if (btn) btn.click();
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'banner-desktop-1280.png') });
  
  // 4. Config round-trip
  console.log("Testing config roundtrip...");
  const configBefore = await page.evaluate(() => window.getTemplateConfig());
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'banner-config-before.json'), JSON.stringify(configBefore, null, 2));
  
  // Reset
  await page.evaluate(() => window.loadTemplateConfig(window.DEFAULT_TEMPLATE_CONFIG));
  await page.waitForTimeout(500);
  
  // Load config
  await page.evaluate((cfg) => window.loadTemplateConfig(cfg), configBefore);
  await page.waitForTimeout(500);
  
  const configAfter = await page.evaluate(() => window.getTemplateConfig());
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'banner-config-after-roundtrip.json'), JSON.stringify(configAfter, null, 2));

  await browser.close();

  fs.writeFileSync(path.join(ARTIFACT_DIR, 'playwright-results.json'), JSON.stringify(results, null, 2));
  console.log('Test completed.');
}

testS4().catch(console.error);
