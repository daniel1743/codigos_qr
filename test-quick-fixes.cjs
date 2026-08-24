const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = path.join(__dirname, 'artifacts/simple-editor/s1.1');

async function testFixes() {
  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  const results = {
    errors: [],
    pageErrors: [],
    failedRequests: []
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') results.errors.push(msg.text());
  });
  page.on('pageerror', err => results.pageErrors.push(err.message));
  page.on('requestfailed', req => results.failedRequests.push(req.url()));

  await page.goto('http://localhost:8080/template-builder.html', { waitUntil: 'networkidle' });

  // 1. Profile size duplicates
  await page.click('#tab-btn-layout');
  await page.fill('#range-profile-size', '200');
  await page.waitForTimeout(100);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'profile-size-fixed.png') });
  console.log('Captured profile-size-fixed.png');

  // 2. Avatar shape active state
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const sqBtn = buttons.find(b => b.textContent.includes('Cuadrado') && !b.textContent.includes('Red.'));
    if (sqBtn) sqBtn.click();
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'avatar-shape-active-state.png') });
  console.log('Captured avatar-shape-active-state.png');

  // 3. Button radius active state
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const rectBtn = buttons.find(b => b.textContent.includes('Rectos'));
    if (rectBtn) rectBtn.click();
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'button-radius-active-state.png') });
  console.log('Captured button-radius-active-state.png');

  // 4. Device switch
  // Mobile at 390
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile-preview.png') });
  console.log('Captured mobile-preview.png');

  // Desktop at 390 (should scale down safely now)
  await page.click('#view-desktop');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'desktop-preview.png') });
  console.log('Captured desktop-preview.png');

  await browser.close();

  fs.writeFileSync(path.join(ARTIFACT_DIR, 'playwright-results.json'), JSON.stringify(results, null, 2));
  console.log('Test completed.');
}

testFixes().catch(err => console.error(err));
