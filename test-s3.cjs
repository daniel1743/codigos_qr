const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = path.join(__dirname, 'artifacts/simple-editor/s3');
const TEST_IMG_DIR = path.join(__dirname, 'test-images');

async function testUploads() {
  console.log("Starting S3 test...");
  const results = { errors: [], pageErrors: [], failedRequests: [] };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') results.errors.push(msg.text());
  });
  page.on('dialog', async dialog => {
    console.log('Dialog:', dialog.message());
    await dialog.accept();
  });

  console.log("Going to page...");
  await page.goto('http://localhost:8080/template-builder.html', { waitUntil: 'networkidle' });

  console.log("Uploading avatar...");
  let [fcAvatar] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.evaluate(() => document.getElementById('btn-upload-profile').click())
  ]);
  await fcAvatar.setFiles(path.join(TEST_IMG_DIR, 'test-avatar.png'));
  
  await page.waitForTimeout(1000);
  
  console.log("Screenshot mobile...");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'avatar-upload.png') });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile-image-preview.png') });
  
  console.log("Restoring desktop...");
  await page.setViewportSize({ width: 1280, height: 800 });

  console.log("Uploading banner...");
  let [fcBanner] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.evaluate(() => document.getElementById('btn-upload-banner').click())
  ]);
  await fcBanner.setFiles(path.join(TEST_IMG_DIR, 'test-banner.jpg'));

  await page.waitForTimeout(1000);
  console.log("Screenshot desktop...");
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'banner-upload.png') });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'desktop-image-preview.png') });

  console.log("Uploading invalid file...");
  let [fcInvalid] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.evaluate(() => document.getElementById('btn-upload-profile').click())
  ]);
  await fcInvalid.setFiles(path.join(TEST_IMG_DIR, 'invalid.txt'));
  
  await page.waitForTimeout(1000);

  const optimizationResults = await page.evaluate(() => window.optimizationResults || []);
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'image-optimization-results.json'), JSON.stringify(optimizationResults, null, 2));

  await browser.close();

  fs.writeFileSync(path.join(ARTIFACT_DIR, 'playwright-results.json'), JSON.stringify(results, null, 2));
  console.log('Test completed.');
}

testUploads().catch(console.error);
