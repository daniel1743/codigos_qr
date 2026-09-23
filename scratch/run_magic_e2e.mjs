import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log("Navigating to http://localhost:3000/login");
  await page.goto("http://localhost:3000/login");
  
  console.log("Logging in...");
  await page.fill('input[type="email"]', 'qa-c2b2-analytics@cripqer.test');
  await page.fill('input[type="password"]', 'CripqerQA!2026');
  await page.click('button[type="submit"]');
  
  try {
    await page.waitForNavigation({ timeout: 5000 });
  } catch (e) {
    console.log("Navigation timeout, checking current URL...");
  }
  
  console.log("Current URL:", page.url());
  await page.screenshot({ path: 'scratch/login_result.png' });
  
  await browser.close();
}
main();
