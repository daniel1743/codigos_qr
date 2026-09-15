const { chromium } = require('@playwright/test');
const fs = require('fs');
const env = {};
for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const BASE = 'http://localhost:8080';
const PAGE_ID = '9a02efa0-f6de-4bf3-930f-edbed88c3e1e';
const PUBLIC_ID = 'yfLEdka';
const base = env.VITE_SUPABASE_URL;
const sr = env.SUPABASE_SERVICE_ROLE_KEY;
const srH = { apikey: sr, Authorization: 'Bearer ' + sr, 'Content-Type': 'application/json', Prefer: 'return=representation' };
const ALIAS = 'qa-mob-' + Date.now();

(async () => {
  const out = {};
  // set alias via REST
  await fetch(base + '/rest/v1/pages?public_id=eq.' + PUBLIC_ID, { method: 'PATCH', headers: srH, body: JSON.stringify({ slug: ALIAS }) });

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
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
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto(BASE + '/pages/' + PAGE_ID, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(3000);
  const o1 = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  out.owner = {
    alias_section: await page.evaluate(() => document.body.innerText.includes('Enlace personalizado')),
    input_fits: await page.locator('#page_alias').isVisible().catch(() => false),
    save_reachable: await page.getByRole('button', { name: 'Guardar', exact: true }).count() > 0,
    copy_reachable: await page.getByRole('button', { name: 'Copiar' }).count() > 0,
    overflow: o1.sw > o1.cw + 1,
    scrollWidth: o1.sw,
    clientWidth: o1.cw,
  };

  const pp = await browser.newPage();
  await pp.setViewportSize({ width: 390, height: 844 });
  const r = await pp.goto(BASE + '/pg/a/' + ALIAS, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pp.waitForTimeout(2000);
  const o2 = await pp.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  out.public_alias = {
    http: r && r.status(),
    renderer: await pp.evaluate(() => Boolean(document.querySelector('[class*="pts-"], main'))),
    overflow: o2.sw > o2.cw + 1,
    scrollWidth: o2.sw,
    clientWidth: o2.cw,
  };
  await pp.close();

  out.runtime_errors = errors;
  await browser.close();

  // cleanup
  await fetch(base + '/rest/v1/pages?public_id=eq.' + PUBLIC_ID, { method: 'PATCH', headers: srH, body: JSON.stringify({ slug: null }) });
  out.cleanup = 'slug restored to null';

  console.log(JSON.stringify(out, null, 2));
})().catch((e) => { console.log(JSON.stringify({ fatal: String(e) }, null, 2)); process.exit(1); });
