/** PAGES_7 — isolate the "edit one safe field + save" behaviour on a QA page. */
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

const FIELD = process.argv[3] ?? "qa-p7-seo-probe";

(async () => {
  const pageId = process.argv[2];
  const out = {};
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on("pageerror", (e) => (out.pageerror = (out.pageerror ?? []).concat(e.message)));

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

  await page.getByRole("button", { name: "Ajustes" }).click();
  await page.waitForTimeout(2000);

  const target = page.locator("aside input").nth(1);
  out.dom = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll("aside input"));
    const element = inputs[1];
    const chain = [];
    let node = element;
    while (node && chain.length < 6) {
      chain.push(`${node.tagName}.${(node.className || "").toString().slice(0, 40)}`);
      node = node.parentElement;
    }
    return {
      editor_roots: document.querySelectorAll('[data-testid="power-editor"]').length,
      asides: document.querySelectorAll("aside").length,
      studios: document.querySelectorAll(".pts-scope").length,
      readOnly: element.readOnly,
      disabled: element.disabled,
      value: element.value,
      chain,
    };
  });

  out.before = await target.inputValue();
  await target.click();
  await target.press("Control+a");
  await target.pressSequentially(FIELD);
  await page.waitForTimeout(500);
  out.after_typing = await target.inputValue();

  await page.locator('button[title="Guardar"]').click();
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await page.waitForTimeout(1000);
    out[`status_${attempt}`] = await page.evaluate(
      () =>
        document.querySelector('[data-testid="power-editor-save-status"]')?.textContent?.trim() ??
        null,
    );
  }
  out.after_save_input = await target.inputValue();

  const row = (
    await (
      await fetch(base + "/rest/v1/pages?select=template_config&id=eq." + pageId, { headers: srH })
    ).json()
  )[0];
  out.db_seo_title = row?.template_config?.editorConfig?.seo?.title ?? null;

  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})().catch((error) => {
  console.log(JSON.stringify({ fatal: String(error) }, null, 2));
  process.exit(1);
});
