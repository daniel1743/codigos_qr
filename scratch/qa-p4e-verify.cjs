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
const srH = { apikey: sr, Authorization: 'Bearer ' + sr, 'Content-Type': 'application/json' };

async function getPageRow() {
  const r = await fetch(base + '/rest/v1/pages?select=*&public_id=eq.' + PUBLIC_ID, { headers: srH });
  return (await r.json())[0];
}
async function getProfileRow() {
  const r = await fetch(base + '/rest/v1/profiles?select=*&public_id=eq.' + PROFILE_PUBLIC_ID, { headers: srH });
  return (await r.json())[0];
}

const VIEWPORTS = [
  { name: '360', w: 360, h: 800 },
  { name: '390', w: 390, h: 844 },
  { name: '430', w: 430, h: 932 },
  { name: '834', w: 834, h: 1112 },
  { name: '1366', w: 1366, h: 768 },
];

(async () => {
  const out = {};
  const browser = await chromium.launch();

  // public routes
  out.public = {};
  {
    const p = await browser.newPage();
    const r = await p.goto(BASE + '/pg/' + PUBLIC_ID, { waitUntil: 'domcontentloaded', timeout: 90000 });
    out.public.child = r && r.status(); await p.close();
  }
  {
    const p = await browser.newPage();
    const r = await p.goto(BASE + '/p/' + PROFILE_PUBLIC_ID, { waitUntil: 'domcontentloaded', timeout: 90000 });
    out.public.profile = r && r.status(); await p.close();
  }
  {
    const p = await browser.newPage();
    const r = await p.goto(BASE + '/pg/qa-does-not-exist', { waitUntil: 'domcontentloaded', timeout: 90000 });
    out.public.nonexistent = r && r.status(); await p.close();
  }

  // auth
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
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

  // viewport overflow audit on PageDetail
  out.viewports = {};
  await page.goto(BASE + '/pages/' + PAGE_ID, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(3000);
  for (const v of VIEWPORTS) {
    await page.setViewportSize({ width: v.w, height: v.h });
    await page.waitForTimeout(400);
    const m = await page.evaluate(() => ({ cw: document.documentElement.clientWidth, sw: document.documentElement.scrollWidth }));
    out.viewports[v.name] = { clientWidth: m.cw, scrollWidth: m.sw, overflow: m.sw > m.cw + 1 };
  }
  out.any_overflow = Object.values(out.viewports).some((x) => x.overflow);
  // page detail content (at 390)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  const bodyText = await page.evaluate(() => document.body.innerText);
  out.page_detail = {
    has_promo: bodyText.includes('Promo septiembre'),
    has_detalles: bodyText.includes('Detalles'),
    has_titulo: bodyText.includes('Título'),
    has_objetivo: bodyText.includes('Objetivo'),
    has_public_id: bodyText.includes('yfLEdka'),
    has_qr_share: await page.getByRole('button', { name: 'QR / Compartir' }).count() > 0,
    has_edit: await page.getByRole('link', { name: 'Editar con Power' }).count() > 0,
    navbars: await page.locator('header[data-platform-navbar]').count(),
  };

  // QR panel opens (read-only)
  await page.getByRole('button', { name: 'QR / Compartir' }).first().click();
  await page.waitForTimeout(1500);
  const qrDest = await page.evaluate(() => {
    const els = [...document.querySelectorAll('p')];
    const el = els.find((e) => (e.textContent || '').includes('/pg/'));
    return el ? el.textContent.trim() : null;
  });
  out.qr_panel = {
    opens: await page.evaluate(() => document.body.innerText.includes('Destino del QR')),
    destination: qrDest,
    dest_correct: !!qrDest && qrDest.endsWith('/pg/' + PUBLIC_ID),
  };

  // edit route mounts
  await page.goto(BASE + '/pages/' + PAGE_ID + '/edit', { waitUntil: 'domcontentloaded', timeout: 90000 });
  let editorMounted = false;
  let editorText = null;
  try {
    await page.waitForSelector('[data-testid="power-editor"]', { timeout: 60000 });
    editorMounted = true;
    editorText = await page.evaluate(() => document.querySelector('[data-testid="power-editor-profile"]')?.textContent?.trim() ?? null);
  } catch {}
  out.page_edit = {
    editor_mounted: editorMounted,
    target: editorText,
    page_target: !!editorText && editorText.startsWith('Página:') && editorText.includes(PUBLIC_ID),
    page_detail_replacing: (await page.evaluate(() => document.body.innerText)).includes('Volver a mis páginas'),
  };

  // list + new
  await page.goto(BASE + '/pages', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(4000);
  out.pages_list = {
    has_mis_paginas: await page.locator('h1', { hasText: 'Mis páginas' }).count() > 0,
    has_promo: await page.evaluate(() => document.body.innerText.includes('Promo septiembre')),
  };
  await page.goto(BASE + '/pages/new', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(2000);
  out.pages_new = {
    h1: (await page.locator('h1').allTextContents().catch(() => []))[0] ?? null,
    has_input: await page.locator('#page_title').count() > 0,
  };

  out.runtime_errors = errors;

  // data invariants
  const pg = await getPageRow();
  const prf = await getProfileRow();
  out.data = {
    child: { published_revision: pg.published_revision, published: pg.published, public_id: pg.public_id, title: pg.title, page_type: pg.page_type, qr_config: pg.qr_config },
    profile: { published_revision: prf.published_revision, public_id: prf.public_id },
  };

  await browser.close();
  console.log(JSON.stringify(out, null, 2));
})().catch((e) => { console.log(JSON.stringify({ fatal: String(e) }, null, 2)); process.exit(1); });

