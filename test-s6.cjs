const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = path.join(__dirname, 'artifacts/simple-editor/s6');

async function testS6() {
  console.log("Starting S6 test...");
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

  // Open Styles tab
  await page.click('#tab-btn-styles');
  await page.waitForTimeout(500);

  const presets = ['solid', 'glass', 'outline', 'soft', 'premium', 'minimal'];

  // 1. Preset Matrix
  console.log("Testing preset matrix...");
  for (const preset of presets) {
      await page.evaluate((p) => window.applyButtonPreset(p), preset);
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, `button-${preset}.png`) });
  }

  // 2. Mobile View
  console.log("Testing mobile view...");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.applyButtonPreset('glass'));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'button-mobile-390.png') });

  // 3. Theme + Preset combination
  console.log("Testing Theme + Preset combination...");
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.evaluate(() => {
     window.applyTheme('black-gold');
     window.applyButtonPreset('solid');
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'button-theme-combination.png') });
  
  // 4. Round trip and Custom State
  console.log("Testing round-trip...");
  await page.evaluate(() => {
     window.applyTheme('rose-gold');
     window.applyButtonPreset('outline');
  });
  await page.waitForTimeout(300);

  // Trigger a custom color change to see if it sets to legacy
  await page.evaluate(() => {
     document.getElementById('color-btn-start').value = "#ff0000";
     window.updateStyles();
  });
  await page.waitForTimeout(300);
  
  const configBefore = await page.evaluate(() => window.getTemplateConfig());
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'button-config-roundtrip.json'), JSON.stringify(configBefore, null, 2));

  // Reset
  await page.evaluate(() => window.loadTemplateConfig(window.DEFAULT_TEMPLATE_CONFIG));
  await page.waitForTimeout(300);
  
  // Reload
  await page.evaluate((cfg) => window.loadTemplateConfig(cfg), configBefore);
  await page.waitForTimeout(300);

  // Assert if button preset restored correctly
  const configAfter = await page.evaluate(() => window.getTemplateConfig());
  if(configAfter.appearance.btnPresetId !== 'legacy') {
     results.errors.push("Roundtrip failed: btnPresetId did not restore as 'legacy'");
  }

  await browser.close();

  fs.writeFileSync(path.join(ARTIFACT_DIR, 'playwright-results.json'), JSON.stringify(results, null, 2));
  console.log('Test completed.');
}

testS6().catch(console.error);
