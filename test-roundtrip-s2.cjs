const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = path.join(__dirname, 'artifacts/simple-editor/s2');

async function testRoundTrip() {
  console.log("Starting test...");
  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  const results = { errors: [], pageErrors: [], failedRequests: [] };
  
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') results.errors.push(msg.text());
  });
  page.on('pageerror', err => results.pageErrors.push(err.message));
  page.on('requestfailed', req => results.failedRequests.push(req.url()));

  console.log("Navigating...");
  await page.goto('http://localhost:8080/template-builder.html', { waitUntil: 'networkidle' });

  console.log("Modifying DOM...");
  await page.fill('#input-logo-text', 'MODIFIED LOGO');
  await page.fill('#social-ig', 'https://instagram.com/my-test');
  
  await page.click('#tab-btn-styles');
  await page.fill('#color-bg-start', '#111111');
  
  await page.click('#tab-btn-layout');
  await page.fill('#range-profile-size', '200');

  await page.click('#tab-btn-content');
  
  console.log("Adding button...");
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const addBtn = buttons.find(b => b.textContent.includes('adir Bot'));
    if (addBtn) addBtn.click();
  });
  
  await page.waitForTimeout(500);

  console.log("Capturing config A...");
  const configA = await page.evaluate(() => window.getTemplateConfig());
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'config-before.json'), JSON.stringify(configA, null, 2));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'before-roundtrip.png') });
  
  console.log("Resetting...");
  await page.evaluate(() => {
    window.confirm = () => true;
    resetTemplate();
  });
  
  await page.waitForTimeout(500);

  console.log("Loading config A...");
  await page.evaluate((cfg) => {
    window.loadTemplateConfig(cfg);
  }, configA);
  
  await page.waitForTimeout(500);
  
  console.log("Capturing config B...");
  const configB = await page.evaluate(() => window.getTemplateConfig());
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'config-after-roundtrip.json'), JSON.stringify(configB, null, 2));
  
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'after-roundtrip.png') });

  console.log("Testing invalid configs...");
  await page.evaluate(() => {
    window.loadTemplateConfig(null);
    window.loadTemplateConfig({ schemaVersion: 999 });
    window.loadTemplateConfig({ links: [ { text: 'no id' } ] });
  });

  console.log("Closing browser...");
  await browser.close();

  fs.writeFileSync(path.join(ARTIFACT_DIR, 'playwright-results.json'), JSON.stringify(results, null, 2));
  console.log('Test completed.');
}

testRoundTrip().catch(console.error);
