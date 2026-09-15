/**
 * PAGES_7 — editor DOM probe: dump the real sidebar inputs and toolbar controls
 * so the runtime QA can target the correct safe field deterministically.
 */
const { chromium } = require("@playwright/test");
const fs = require("fs");

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
}

const BASE = "http://localhost:8080";
const base = env.VITE_SUPABASE_URL;
const sr = env.SUPABASE_SERVICE_ROLE_KEY;
const srH = { apikey: sr, Authorization: "Bearer " + sr, "Content-Type": "application/json" };

(async () => {
  const pageId = process.argv[2];
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(BASE + "/editor", { waitUntil: "domcontentloaded", timeout: 90000 });
  try {
    await page.waitForSelector("#email", { timeout: 20000 });
  } catch {}
  if (await page.locator("#email").isVisible().catch(() => false)) {
    await page.locator("#email").fill(env.QA_EMAIL);
    await page.locator("#password").fill(env.QA_PASSWORD);
    await page.getByRole("button", { name: "Entrar al editor" }).click();
  }
  await page.waitForFunction(() => document.cookie.includes("sb-"), { timeout: 30000 }).catch(() => {});

  await page.goto(BASE + "/pages/" + pageId + "/edit", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector('[data-testid="power-editor"]', { timeout: 60000 });
  await page.waitForTimeout(2500);

  await page.getByRole("button", { name: "Ajustes", exact: true }).click();
  await page.waitForTimeout(1200);
  const settingsInputs = await page.evaluate(() =>
    Array.from(document.querySelectorAll("aside input")).map((element, index) => {
      const label = element.closest("label");
      return {
        index,
        label: label ? label.textContent : null,
        value: element.value,
        type: element.getAttribute("type"),
      };
    }),
  );

  await page.getByRole("button", { name: "Diseño", exact: true }).click();
  await page.waitForTimeout(1200);
  const designInputs = await page.evaluate(() =>
    Array.from(document.querySelectorAll("aside input")).map((element, index) => {
      const label = element.closest("label");
      return {
        index,
        label: label ? label.textContent : null,
        value: element.value,
        type: element.getAttribute("type"),
      };
    }),
  );

  console.log(JSON.stringify({ settingsInputs, designInputs }, null, 2));
  await browser.close();
})().catch((error) => {
  console.log(JSON.stringify({ fatal: String(error) }, null, 2));
  process.exit(1);
});
