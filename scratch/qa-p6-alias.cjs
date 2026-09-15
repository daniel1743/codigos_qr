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
const PROFILE_PUBLIC_ID = 'sY9wHGm';
const base = env.VITE_SUPABASE_URL;
const sr = env.SUPABASE_SERVICE_ROLE_KEY;
const srH = { apikey: sr, Authorization: 'Bearer ' + sr, 'Content-Type': 'application/json', Prefer: 'return=representation' };

async function getPageRow() {
  const r = await fetch(base + '/rest/v1/pages?select=*&public_id=eq.' + PUBLIC_ID, { headers: srH });
  return (await r.json())[0];
}
async function getProfileRow() {
  const r = await fetch(base + '/rest/v1/profiles?select=*&public_id=eq.' + PROFILE_PUBLIC_ID, { headers: srH });
  return (await r.json())[0];
}
async function patchSlug(slug) {
  const r = await fetch(base + '/rest/v1/pages?public_id=eq.' + PUBLIC_ID, {
    method: 'PATCH', headers: srH, body: JSON.stringify({ slug }),
  });
  return { status: r.status };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ALIAS1 = 'qa-alias-' + Date.now();
const ALIAS2 = 'qa-alias2-' + Date.now();

(async () => {
  const out = {};
  const browser = await chromium.launch();
  const originalSlug = (await getPageRow()).slug;
  out.original_slug = originalSlug;

  out.public = {};
  {
    const p = await browser.newPage();
    const r = await p.goto(BASE + '/pg/' + PUBLIC_ID, { waitUntil: 'domcontentloaded', timeout: 90000 });
    out.public.stable_page = r && r.status(); await p.close();
  }
  {
    const p = await browser.newPage();
    const r = await p.goto(BASE + '/p/' + PROFILE_PUBLIC_ID, { waitUntil: 'domcontentloaded', timeout: 90000 });
    out.public.profile = r && r.status(); await p.close();
  }

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
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

  await page.goto(BASE + '/pages/' + PAGE_ID, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(3000);
  out.alias_ui = {
    section_present: await page.evaluate(() => document.body.innerText.includes('Enlace personalizado')),
    input_present: await page.locator('#page_alias').count() > 0,
    prefix_shown: await page.evaluate(() => document.body.innerText.includes('cripqer.dev/pg/a/')),
  };

  await page.locator('#page_alias').fill(ALIAS1);
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await page.waitForTimeout(2000);
  out.save1 = {
    saved_message: await page.evaluate(() => document.body.innerText.includes('Enlace guardado')),
    url_shown: await page.evaluate((a) => document.body.innerText.includes(a), ALIAS1),
  };

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(3000);
  const inputVal = await page.locator('#page_alias').inputValue().catch(() => null);
  out.refresh = {
    input_value: inputVal,
    persisted: inputVal === ALIAS1,
    copy_button: await page.getByRole('button', { name: 'Copiar' }).count() > 0,
    remove_button: await page.getByRole('button', { name: 'Quitar' }).count() > 0,
  };
  out.db_after_save1 = (await getPageRow()).slug;
  // public alias resolution
  const pubPage = await browser.newPage();
  const pubErrors = [];
  pubPage.on('pageerror', (e) => pubErrors.push(e.message));
  const ar = await pubPage.goto(BASE + '/pg/a/' + ALIAS1, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pubPage.waitForTimeout(2500);
  out.alias_public1 = {
    http: ar && ar.status(),
    title_match: await pubPage.evaluate(() => document.body.innerText.includes('Promo septiembre')),
    renderer_mounted: await pubPage.evaluate(() => Boolean(document.querySelector('[class*="pts-"], main'))),
    editor_chrome: await pubPage.evaluate(() => Boolean(document.querySelector('[data-testid="power-editor"], .basic-editor-shell'))),
    runtime_errors: pubErrors,
  };
  await pubPage.close();

  // rename to alias 2
  await page.locator('#page_alias').fill(ALIAS2);
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await page.waitForTimeout(2000);
  const pubPage2 = await browser.newPage();
  const r1 = await pubPage2.goto(BASE + '/pg/a/' + ALIAS1, { waitUntil: 'domcontentloaded', timeout: 90000 });
  out.old_alias_after_rename = r1 && r1.status();
  const r2 = await pubPage2.goto(BASE + '/pg/a/' + ALIAS2, { waitUntil: 'domcontentloaded', timeout: 90000 });
  out.new_alias_after_rename = r2 && r2.status();
  await pubPage2.close();

  // remove alias
  await page.getByRole('button', { name: 'Quitar' }).click();
  await page.waitForTimeout(2000);
  const pubPage3 = await browser.newPage();
  const r3 = await pubPage3.goto(BASE + '/pg/a/' + ALIAS2, { waitUntil: 'domcontentloaded', timeout: 90000 });
  out.alias_after_remove = r3 && r3.status();
  await pubPage3.close();

  const p2 = await browser.newPage();
  const r4 = await p2.goto(BASE + '/pg/' + PUBLIC_ID, { waitUntil: 'domcontentloaded', timeout: 90000 });
  out.stable_page_after = r4 && r4.status();
  await p2.close();

  out.runtime_errors = errors;

  const pg = await getPageRow();
  const prf = await getProfileRow();
  out.data = {
    child: { public_id: pg.public_id, published_revision: pg.published_revision, qr_config: pg.qr_config, slug: pg.slug },
    profile: { public_id: prf.public_id, slug: prf.slug, published_revision: prf.published_revision },
  };

  if (JSON.stringify(pg.slug) !== JSON.stringify(originalSlug)) {
    out.cleanup = await patchSlug(originalSlug);
    await sleep(800);
    out.cleanup_slug_after = (await getPageRow()).slug;
  } else {
    out.cleanup = { note: 'no restore needed' };
  }

  await browser.close();
  console.log(JSON.stringify(out, null, 2));
})().catch((e) => { console.log(JSON.stringify({ fatal: String(e) }, null, 2)); process.exit(1); });

