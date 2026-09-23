import { chromium } from "playwright";

const url = process.env.MAGIC_QA_URL ?? "http://127.0.0.1:8081/labs/magic-editor";
const dir = "qa/magic-standalone";
const browser = await chromium.launch({ headless: true });

async function pageAt(width, height = 900) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(url, { waitUntil: "commit", timeout: 10_000 }).catch(() => undefined);
  await page.waitForTimeout(1_500);
  return page;
}

const desktop = await pageAt(1440, 1000);
const result = { desktop: {}, mobile: {}, functional: {} };
result.desktop.assetsLoaded = await desktop.locator('img[src*="magic-page-editor"]').evaluateAll((imgs) => imgs.every((img) => img.complete && img.naturalWidth > 0));
result.desktop.overflow = await desktop.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
await desktop.screenshot({ path: `${dir}/desktop-1440-normal-viewport.png` });

await desktop.getByText("Marina Solé", { exact: true }).first().click();
await desktop.getByText("Marina Solé", { exact: true }).first().click();
await desktop.waitForTimeout(150);
result.functional.textEditable = (await desktop.locator('[contenteditable="true"]').count()) > 0;
await desktop.screenshot({ path: `${dir}/desktop-1440-text-selected.png` });

const textEditor = desktop.locator('[contenteditable="true"]').last();
if (await textEditor.count()) {
  const before = await textEditor.innerText();
  await textEditor.fill(`${before} QA`);
  await textEditor.press("Tab");
  result.functional.textEdit = (await desktop.locator("body").innerText()).includes(" QA");
  await desktop.getByTitle("Deshacer").click();
  result.functional.undo = !(await desktop.locator("body").innerText()).includes(" QA");
  await desktop.getByTitle("Rehacer").click();
  result.functional.redo = (await desktop.locator("body").innerText()).includes(" QA");
}

const avatarTarget = desktop.locator('[data-cq]').filter({ has: desktop.locator('img[alt="Marina Solé"]') }).first();
await avatarTarget.click({ force: true });
await desktop.waitForTimeout(150);
result.functional.avatarSelect = (await desktop.locator('[data-selected="true"]').count()) > 0;
await desktop.screenshot({ path: `${dir}/desktop-1440-avatar-selected.png` });

const heroTarget = desktop.locator('[data-cq]').filter({ has: desktop.locator('img[alt="Costa mediterránea al atardecer"]') }).first();
await heroTarget.click({ force: true });
await desktop.waitForTimeout(150);
result.functional.heroSelect = (await desktop.locator('[data-selected="true"]').count()) > 0;
await desktop.screenshot({ path: `${dir}/desktop-1440-hero-selected.png` });

const cta = desktop.locator('[data-cq]').filter({ hasText: "Colaboremos" }).first();
if (await cta.count()) {
  await cta.click({ force: true });
  await desktop.waitForTimeout(150);
  result.functional.ctaSelect = (await desktop.locator('[data-selected="true"]').count()) > 0;
  await desktop.screenshot({ path: `${dir}/desktop-1440-cta-selected.png` });
}

for (const width of [360, 390, 430]) {
  const mobile = await pageAt(width);
  result.mobile[width] = {
    assetsLoaded: await mobile.locator('img[src*="magic-page-editor"]').evaluateAll((imgs) => imgs.every((img) => img.complete && img.naturalWidth > 0)),
    overflow: await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  };
  await mobile.screenshot({ path: `${dir}/mobile-${width}.png` });
  await mobile.getByText("Marina Solé", { exact: true }).first().click();
  await mobile.getByText("Marina Solé", { exact: true }).first().click();
  await mobile.waitForTimeout(150);
  result.mobile[width].selected = (await mobile.locator('[data-selected="true"]').count()) > 0;
  await mobile.screenshot({ path: `${dir}/mobile-${width}-text-selected.png` });
  await mobile.close();
}

console.log(JSON.stringify(result, null, 2));
await desktop.close();
await browser.close();
