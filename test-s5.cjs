const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = path.join(__dirname, 'artifacts/simple-editor/s5');

async function testS5() {
  console.log("Starting S5 test...");
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

  // Open Styles tab to see themes
  await page.click('#tab-btn-styles');
  await page.waitForTimeout(500);

  const themes = [
    'black-gold', 'black-silver', 'platinum', 'rose-gold', 'emerald-luxury',
    'executive-blue', 'burgundy-elegant', 'ivory-gold', 'graphite', 'premium-white'
  ];

  // 1. Apply each theme and screenshot
  for (const theme of themes) {
      console.log(`Testing theme ${theme}...`);
      await page.evaluate((t) => window.applyTheme(t), theme);
      await page.waitForTimeout(300);
      
      // Specifically taking screenshots for required artifacts
      if (['black-gold', 'platinum', 'rose-gold', 'emerald-luxury', 'executive-blue', 'ivory-gold', 'premium-white'].includes(theme)) {
          let artifactName = theme === 'emerald-luxury' ? 'theme-emerald' : `theme-${theme}`;
          await page.screenshot({ path: path.join(ARTIFACT_DIR, `${artifactName}.png`) });
      }
  }

  // 2. Mobile View
  console.log("Testing mobile view of themes...");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.applyTheme('black-gold'));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'themes-mobile-390.png') });

  // 3. Round trip and Custom State
  console.log("Testing round-trip...");
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.evaluate(() => window.applyTheme('rose-gold'));
  await page.waitForTimeout(300);

  // Trigger a custom color change to see if it goes to "custom"
  await page.evaluate(() => {
     document.getElementById('color-bg-start').value = "#ff0000";
     window.updateStyles();
  });
  await page.waitForTimeout(300);
  
  const configBefore = await page.evaluate(() => window.getTemplateConfig());
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'theme-config-before.json'), JSON.stringify(configBefore, null, 2));

  // Reset
  await page.evaluate(() => window.loadTemplateConfig(window.DEFAULT_TEMPLATE_CONFIG));
  await page.waitForTimeout(300);
  
  // Reload
  await page.evaluate((cfg) => window.loadTemplateConfig(cfg), configBefore);
  await page.waitForTimeout(300);

  const configAfter = await page.evaluate(() => window.getTemplateConfig());
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'theme-config-after-roundtrip.json'), JSON.stringify(configAfter, null, 2));

  await browser.close();

  fs.writeFileSync(path.join(ARTIFACT_DIR, 'playwright-results.json'), JSON.stringify(results, null, 2));
  console.log('Test completed.');
}

testS5().catch(console.error);
