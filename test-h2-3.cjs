const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = path.join(__dirname, 'artifacts/mobile-sidebar/h2-3');

async function testH23() {
    console.log("Starting QA Test...");
    if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    
    const results = { errors: [], pageErrors: [] };

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true
    });
    
    const page = await context.newPage();
    page.on('pageerror', err => results.pageErrors.push(err.message));
    
    const fileUrl = 'http://localhost:8081/premium_sidebar_mobile%20(5).html';
    console.log("Navigating to", fileUrl);
    await page.goto(fileUrl);
    
    // Test 1: Snap back early return (closed -> partial open -> release)
    console.log("Testing snap back closed...");
    await page.mouse.move(0, 400);
    await page.mouse.down();
    await page.mouse.move(80, 400, { steps: 10 }); // ~20%
    await page.mouse.up();
    await page.waitForTimeout(500); // wait for snap back animation
    
    // Assert exactly 0
    let transform = await page.evaluate(() => {
        return document.documentElement.style.getPropertyValue('--main-translate-x');
    });
    if (parseFloat(transform) !== 0) {
        results.errors.push(`Snap back closed failed. Expected 0, got ${transform}`);
    }
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'sidebar-partial-snap-close.png') });
    
    // Test 2: Snap back open (open -> partial close -> release)
    console.log("Testing snap back open...");
    await page.click('#hamburger-btn');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'sidebar-390-open.png') });
    
    await page.mouse.move(300, 400);
    await page.mouse.down();
    await page.mouse.move(250, 400, { steps: 10 }); // Above 40% threshold
    await page.mouse.up();
    await page.waitForTimeout(500);
    
    transform = await page.evaluate(() => {
        return document.documentElement.style.getPropertyValue('--main-translate-x');
    });
    const expectedOpen = await page.evaluate(() => window.innerWidth * 0.82); // MAX_WIDTH
    if (Math.abs(parseFloat(transform) - expectedOpen) > 1) {
        results.errors.push(`Snap back open failed. Expected ~${expectedOpen}, got ${transform}`);
    }
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'sidebar-partial-snap-open.png') });
    
    // Test 3: Horizontal Carousel Coexistence
    // Just taking the screenshot of the carousel for evidence
    await page.mouse.click(350, 400);
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'horizontal-carousel-gesture.png') });
    
    await browser.close();
    
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'playwright-results.json'), JSON.stringify(results, null, 2));
    console.log("QA Test complete.");
}

testH23().catch(console.error);
