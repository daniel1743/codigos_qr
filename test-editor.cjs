const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = path.join(__dirname, 'artifacts/simple-editor/s1');

async function runTests() {
  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  const results = {
    errors: [],
    pageErrors: [],
    failedRequests: []
  };

  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      results.errors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    results.pageErrors.push(err.message);
  });

  page.on('requestfailed', request => {
    results.failedRequests.push(request.url());
  });

  console.log('Navigating to editor...');
  await page.goto('http://localhost:8080/template-builder.html', { waitUntil: 'networkidle' });

  // Take initial screenshot
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'baseline-editor.png') });
  console.log('Captured baseline-editor.png');

  // Verify responsive viewports
  const viewports = [
    { width: 375, height: 667, name: 'mobile' },
    { width: 390, height: 844, name: 'mobile-large' },
    { width: 768, height: 1024, name: 'tablet' },
    { width: 1280, height: 800, name: 'desktop' }
  ];

  for (const vp of viewports) {
    await page.setViewportSize(vp);
    await page.waitForTimeout(500); // Wait for reflow
    if (vp.name === 'mobile') {
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile-view.png') });
      console.log('Captured mobile-view.png');
    } else if (vp.name === 'desktop') {
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'desktop-view.png') });
      console.log('Captured desktop-view.png');
    }
  }

  // Restore desktop viewport
  await page.setViewportSize({ width: 1280, height: 800 });

  // Test content interaction
  // We need to dump HTML to know what IDs exist
  const html = await page.content();
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'page-content.html'), html);
  console.log('Dumped page content for inspection.');
  
  await browser.close();
  
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'playwright-results.json'), JSON.stringify(results, null, 2));
  console.log('Playwright tests completed.');
}

runTests().catch(err => console.error(err));
