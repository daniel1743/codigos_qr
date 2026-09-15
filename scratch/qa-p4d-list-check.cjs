const { chromium } = require('@playwright/test');
const fs = require('fs');
const env = {};
for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const BASE = 'http://localhost:8080';
(async () => {
  const out = {};
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const ap = await context.newPage();
  await ap.goto(BASE + '/editor', { waitUntil: 'domcontentloaded', timeout: 90000 });
  try { await ap.waitForSelector('#email', { timeout: 30000 }); } catch {}
  if (await ap.locator('#email').isVisible().catch(() => false)) {
    await ap.locator('#email').fill(env.QA_EMAIL);
    await ap.locator('#password').fill(env.QA_PASSWORD);
    await ap.getByRole('button', { name: 'Entrar al editor' }).click();
  }
  try { await ap.waitForFunction(() => document.cookie.includes('sb-'), { timeout: 30000 }); } catch {}
  await ap.close();

  const page = await context.newPage();
  await page.goto(BASE + '/pages', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(6000);
  out.pages_list = {
    has_promo: await page.evaluate(() => document.body.innerText.includes('Promo septiembre')),
    body_snippet: (await page.evaluate(() => document.body.innerText)).slice(0, 400),
  };
  await browser.close();
  console.log(JSON.stringify(out, null, 2));
})().catch((e) => { console.log(JSON.stringify({ fatal: String(e) }, null, 2)); process.exit(1); });
