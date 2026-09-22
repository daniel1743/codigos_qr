/**
 * PAGES_7 — editor save mechanism probe: does the frozen Power Editor's manual
 * save actually reach `pages.template_config`?
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
const srH = {
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY,
  "Content-Type": "application/json",
};

(async () => {
  const pageId = process.argv[2];
  const value = process.argv[3] ?? "#1a2b3c";
  const out = { page_id: pageId, value, requests: [] };
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on("request", (request) => {
    if (request.url().includes("/rest/v1/pages") || request.url().includes("/rest/v1/rpc/")) {
      out.requests.push(`${request.method()} ${request.url().replace(base, "")}`);
    }
  });
  page.on("console", (message) => {
    if (message.type() === "error")
      out.console_errors = (out.console_errors ?? []).concat(message.text());
  });

  await page.goto(BASE + "/editor", { waitUntil: "domcontentloaded", timeout: 90000 });
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
  await page
    .waitForFunction(() => document.cookie.includes("sb-"), { timeout: 30000 })
    .catch(() => {});

  await page.goto(BASE + "/pages/" + pageId + "/edit", {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForSelector('[data-testid="power-editor"]', { timeout: 60000 });
  await page.waitForTimeout(4000);
  await page.getByRole("button", { name: "Diseño", exact: true }).click();
  await page.waitForTimeout(1500);

  const input = page.locator('aside input[type="text"]').first();
  await input.fill(value);
  await page.waitForTimeout(2000);
  out.after_typing = await input.inputValue();

  out.requests_before_save = out.requests.slice();

  await page.getByTitle("Guardar").click();
  const statuses = [];
  for (let i = 0; i < 20; i += 1) {
    await page.waitForTimeout(1000);
    statuses.push(
      await page.evaluate(
        () =>
          document.querySelector('[data-testid="power-editor-save-status"]')?.textContent?.trim() ??
          null,
      ),
    );
  }
  out.statuses = statuses;
  out.requests_after_save = out.requests.slice();

  const row = (
    await (
      await fetch(base + "/rest/v1/pages?select=template_config&id=eq." + pageId, { headers: srH })
    ).json()
  )[0];
  out.db_primary = row?.template_config?.editorConfig?.theme?.colors?.primary ?? null;

  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})().catch((error) => {
  console.log(JSON.stringify({ fatal: String(error) }, null, 2));
  process.exit(1);
});
