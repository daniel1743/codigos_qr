/**
 * PAGES_7B — isolation probe: can this machine's Chromium render the app routes
 * at all under the current memory pressure?
 */
const { chromium } = require("@playwright/test");
const fs = require("fs");

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
}

const BASE = "http://localhost:8080";
const LAUNCH_ARGS = [
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--disable-extensions",
  "--disable-background-networking",
];

(async () => {
  const out = { steps: [] };
  const browser = await chromium.launch({ args: LAUNCH_ARGS });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push("pageerror: " + error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push("console: " + message.text().slice(0, 200));
  });

  try {
    let response = await page.goto(BASE + "/editor", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    out.steps.push({ route: "/editor", http: response ? response.status() : null });
    try {
      await page.waitForSelector("#email", { timeout: 20000 });
    } catch {}
    if (
      await page
        .locator("#email")
        .isVisible()
        .catch(() => false)
    ) {
      await page.locator("#email").fill(env.QA_EMAIL);
      await page.locator("#password").fill(env.QA_PASSWORD);
      await page.getByRole("button", { name: "Entrar al editor" }).click();
    }
    await page.waitForFunction(() => document.cookie.includes("sb-"), { timeout: 30000 });
    out.auth = true;

    response = await page.goto(BASE + "/pages/new", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await page.waitForTimeout(6000);
    out.steps.push({
      route: "/pages/new",
      http: response ? response.status() : null,
      h1: await page
        .locator("h1")
        .first()
        .textContent()
        .catch(() => null),
      create_buttons: await page.getByRole("button", { name: "Crear" }).count(),
    });

    await page.getByRole("button", { name: "Crear" }).first().click();
    await page.waitForSelector("#generated_title", { timeout: 30000 });
    await page.waitForTimeout(4000);
    out.steps.push({
      route: "/pages/new (services form)",
      title_value: await page.locator("#generated_title").inputValue(),
      items: await page.locator("section[data-testid='page-generator-items']").count(),
    });
  } catch (error) {
    out.fatal = String(error).split("\n")[0];
  }

  out.errors = errors;
  try {
    await browser.close();
  } catch {}
  console.log(JSON.stringify(out, null, 2));
})().catch((error) => {
  console.log(JSON.stringify({ fatal: String(error) }, null, 2));
  process.exit(1);
});
