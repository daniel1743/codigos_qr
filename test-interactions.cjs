const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = path.join(__dirname, 'artifacts/simple-editor/s1');

async function testInteractions() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  await page.goto('http://localhost:8080/template-builder.html', { waitUntil: 'networkidle' });

  // 1. Core interaction verification
  await page.fill('#input-logo-text', 'NEW LOGO TEST');
  await page.fill('#input-title-text', 'NEW TITLE TEST');
  await page.fill('#social-ig', 'https://instagram.com/test');
  
  // Change layout/styles
  await page.click('#tab-btn-styles');
  await page.fill('#color-bg-start', '#ff0000');
  await page.fill('#color-bg-end', '#0000ff');

  // Dynamic button regression
  await page.click('#tab-btn-content');
  // Use id or class instead of text to add button
  await page.evaluate(() => {
    // Find the add button
    const buttons = Array.from(document.querySelectorAll('button'));
    const addBtn = buttons.find(b => b.textContent.includes('adir Bot'));
    if (addBtn) addBtn.click();
  });
  
  await page.waitForTimeout(500);

  // Take screenshot
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'dynamic-button-after.png') });
  console.log('Captured dynamic-button-after.png');
  
  // Test export
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const exportBtn = buttons.find(b => b.textContent.includes('Exportar HTML'));
    if (exportBtn) exportBtn.click();
  });
  
  await page.waitForTimeout(500);
  
  const exportCode = await page.textContent('#export-code-content');
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'exported-code.html'), exportCode || '');
  console.log('Exported code verified.');

  await browser.close();
}

testInteractions().catch(err => console.error(err));
