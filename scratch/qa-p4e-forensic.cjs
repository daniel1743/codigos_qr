const { chromium } = require("@playwright/test");
const fs = require("fs");
const env = {};
for (const l of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const BASE = "http://localhost:8080";
const PAGE_ID = "9a02efa0-f6de-4bf3-930f-edbed88c3e1e";

(async () => {
  const out = {};
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const ap = await context.newPage();
  await ap.goto(BASE + "/editor", { waitUntil: "domcontentloaded", timeout: 90000 });
  try {
    await ap.waitForSelector("#email", { timeout: 30000 });
  } catch {}
  if (
    await ap
      .locator("#email")
      .isVisible()
      .catch(() => false)
  ) {
    await ap.locator("#email").fill(env.QA_EMAIL);
    await ap.locator("#password").fill(env.QA_PASSWORD);
    await ap.getByRole("button", { name: "Entrar al editor" }).click();
  }
  try {
    await ap.waitForFunction(() => document.cookie.includes("sb-"), { timeout: 30000 });
  } catch {}
  await ap.close();

  const page = await context.newPage();
  await page.goto(BASE + "/pages/" + PAGE_ID, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(4000);

  out.viewport = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));

  out.overflowing = await page.evaluate(() => {
    const cw = document.documentElement.clientWidth;
    const results = [];
    for (const el of document.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (r.right > cw + 1 || r.left < -1) {
        const cs = getComputedStyle(el);
        // build a compact selector
        let sel = el.tagName.toLowerCase();
        if (el.id) sel += "#" + el.id;
        const cls =
          el.className && typeof el.className === "string"
            ? el.className.trim().split(/\s+/).slice(0, 3).join(".")
            : "";
        if (cls) sel += "." + cls;
        const text = (el.textContent || "").trim().slice(0, 40);
        results.push({
          sel,
          text,
          left: Math.round(r.left),
          right: Math.round(r.right),
          width: Math.round(r.width),
          overflowX: cs.overflowX,
          whiteSpace: cs.whiteSpace,
          flexShrink: cs.flexShrink,
          minWidth: cs.minWidth,
          display: cs.display,
          flexWrap: cs.flexWrap,
        });
      }
    }
    // dedupe and sort by right desc
    return results.sort((a, b) => b.right - a.right).slice(0, 40);
  });

  await browser.close();
  console.log(JSON.stringify(out, null, 2));
})().catch((e) => {
  console.log(JSON.stringify({ fatal: String(e) }, null, 2));
  process.exit(1);
});
