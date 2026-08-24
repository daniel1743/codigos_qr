const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = path.join(__dirname, 'artifacts/simple-editor/s1.1');

async function testFixes() {
  const results = { errors: [], pageErrors: [], failedRequests: [] };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  await page.goto('http://localhost:8080/template-builder.html', { waitUntil: 'networkidle' });

  // Switch to desktop mode while the button is visible
  await page.click('#view-desktop');
  await page.waitForTimeout(300);

  // Shrink the viewport to 390 to verify desktop scales down safely instead of forcing mobile
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'desktop-preview.png') });
  console.log('Captured desktop-preview.png');

  await browser.close();
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'playwright-results.json'), JSON.stringify(results, null, 2));
}

testFixes().catch(console.error);
