import { chromium } from "playwright";

const baseUrl = process.env.MAGIC_QA_URL ?? "http://127.0.0.1:8081/labs/magic-editor";
const output = "qa/magic-standalone";

async function capture(page, name, options = {}) {
  await page.screenshot({ path: `${output}/${name}.png`, ...options });
}

async function boot(browser, width, height) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(baseUrl, { waitUntil: "commit", timeout: 10_000 }).catch(() => undefined);
  await page.waitForTimeout(1_500);
  return page;
}

const browser = await chromium.launch({ headless: true });
const results = {
  desktop: {},
  mobile: {},
  interactions: {},
};

const desktop = await boot(browser, 1440, 1000);
await capture(desktop, "desktop-1440-normal", { fullPage: true });
results.desktop[1440] = {
  hero: await desktop.locator('img[alt="Costa mediterránea al atardecer"]').count(),
  avatar: await desktop.locator('img[alt="Marina Solé"]').count(),
  latest: await desktop.getByText("Lo último", { exact: true }).count(),
  links: await desktop.getByText("Colaboremos", { exact: true }).count(),
  overflow: await desktop.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
};

await desktop.getByText("Marina Solé", { exact: true }).last().click();
await desktop.waitForTimeout(150);
await capture(desktop, "desktop-1440-text-selected");
results.interactions.textSelected = await desktop.locator('[contenteditable="true"]').count();

await desktop.locator('img[alt="Marina Solé"]').first().click();
await desktop.waitForTimeout(150);
await capture(desktop, "desktop-1440-avatar-selected");
results.interactions.avatarSelected = await desktop.locator('[data-selected="true"]').count();

await desktop.locator('img[alt="Costa mediterránea al atardecer"]').first().click();
await desktop.waitForTimeout(150);
await capture(desktop, "desktop-1440-hero-selected");
results.interactions.heroSelected = await desktop.locator('[data-selected="true"]').count();

await desktop.getByText("Colaboremos", { exact: true }).click();
await desktop.waitForTimeout(150);
await capture(desktop, "desktop-1440-cta-selected");
results.interactions.ctaSelected = await desktop.locator('[data-selected="true"]').count();

await desktop.getByText("Lo último", { exact: true }).scrollIntoViewIfNeeded();
const cardImage = desktop.locator('img[alt="Calle mediterránea con buganvillas"]').first();
if (await cardImage.count()) {
  await cardImage.click();
  await desktop.waitForTimeout(150);
  await capture(desktop, "desktop-1440-card-selected");
  results.interactions.cardSelected = await desktop.locator('[data-selected="true"]').count();
}

const mobileWidths = [360, 390, 430];
for (const width of mobileWidths) {
  const mobile = await boot(browser, width, 900);
  await capture(mobile, `mobile-${width}`, { fullPage: true });
  results.mobile[width] = {
    overflow: await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    hero: await mobile.locator('img[alt="Costa mediterránea al atardecer"]').count(),
    avatar: await mobile.locator('img[alt="Marina Solé"]').count(),
    mobileSheet: await mobile.getByText("Editar", { exact: true }).count(),
  };
  await mobile.getByText("Marina Solé", { exact: true }).last().click();
  await mobile.waitForTimeout(150);
  await capture(mobile, `mobile-${width}-text-selected`);
  await mobile.close();
}

await desktop.close();
console.log(JSON.stringify(results, null, 2));
await browser.close();
