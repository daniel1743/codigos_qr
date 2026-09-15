const { chromium } = require('@playwright/test');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Load env without printing values
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
const srH = {
  apikey: sr,
  Authorization: 'Bearer ' + sr,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function getPageRow() {
  const r = await fetch(base + '/rest/v1/pages?select=*&public_id=eq.' + PUBLIC_ID, { headers: srH });
  return (await r.json())[0];
}
async function getProfileRow() {
  const r = await fetch(base + '/rest/v1/profiles?select=*&public_id=eq.' + PROFILE_PUBLIC_ID, { headers: srH });
  return (await r.json())[0];
}
async function patchPageQrConfig(qr_config) {
  const r = await fetch(base + '/rest/v1/pages?public_id=eq.' + PUBLIC_ID, {
    method: 'PATCH',
    headers: srH,
    body: JSON.stringify({ qr_config }),
  });
  return { status: r.status, body: (await r.text()).slice(0, 200) };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const out = {};
  const browser = await chromium.launch();

  // ============ PHASE 8: PUBLIC ROUTES (no auth) ============
  out.public = {};
  {
    const page = await browser.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    const resp = await page.goto(BASE + '/pg/' + PUBLIC_ID, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(2500);
    out.public.child = {
      http: resp && resp.status(),
      renderer_mounted: await page.evaluate(() => Boolean(document.querySelector('[class*="pts-"], [data-testid*="template"], main'))),
      editor_chrome: await page.evaluate(() => Boolean(document.querySelector('[data-testid="power-editor"], [data-testid="editor-shell"], .basic-editor-shell'))),
      error_boundary: await page.evaluate(() => /error boundary|Something went wrong/i.test(document.body.innerText)),
      runtime_errors: errors,
    };
    await page.close();
  }
  {
    const page = await browser.newPage();
    const resp = await page.goto(BASE + '/p/' + PROFILE_PUBLIC_ID, { waitUntil: 'domcontentloaded', timeout: 90000 });
    out.public.profile = { http: resp && resp.status() };
    await page.close();
  }
  {
    const page = await browser.newPage();
    const resp = await page.goto(BASE + '/pg/qa-does-not-exist', { waitUntil: 'domcontentloaded', timeout: 90000 });
    out.public.nonexistent = { http: resp && resp.status() };
    await page.close();
  }

  // ============ AUTH (shared context) ============
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
  const authPage = await context.newPage();
  const authErrors = [];
  authPage.on('console', (m) => { if (m.type() === 'error') authErrors.push('console: ' + m.text()); });
  authPage.on('pageerror', (e) => authErrors.push('pageerror: ' + e.message));

  await authPage.goto(BASE + '/editor', { waitUntil: 'domcontentloaded', timeout: 90000 });
  try { await authPage.waitForSelector('#email', { timeout: 30000 }); } catch {}
  if (await authPage.locator('#email').isVisible().catch(() => false)) {
    await authPage.locator('#email').fill(env.QA_EMAIL);
    await authPage.locator('#password').fill(env.QA_PASSWORD);
    await authPage.getByRole('button', { name: 'Entrar al editor' }).click();
  }
  let authed = false;
  try {
    await authPage.waitForFunction(() => document.cookie.includes('sb-'), { timeout: 30000 });
    authed = true;
  } catch {}
  out.auth = { authenticated: authed, runtime_errors: authErrors };
  await authPage.close();

  if (!authed) {
    out.fatal = 'QA owner could not authenticate';
    await browser.close();
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  // ============ PHASE 1: PAGES ROUTING ============
  const listPage = await context.newPage();
  const listErrors = [];
  listPage.on('console', (m) => { if (m.type() === 'error') listErrors.push('console: ' + m.text()); });
  listPage.on('pageerror', (e) => listErrors.push('pageerror: ' + e.message));

  // test_1: /pages
  const r1 = await listPage.goto(BASE + '/pages', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await listPage.waitForTimeout(3000);
  out.pages_list = {
    http: r1 && r1.status(),
    url: listPage.url(),
    has_mis_paginas_heading: await listPage.locator('h1', { hasText: 'Mis páginas' }).count() > 0,
    has_promo: await listPage.evaluate(() => document.body.innerText.includes('Promo septiembre')),
    runtime_errors: listErrors,
  };

  // test_2: /pages/new
  await listPage.goto(BASE + '/pages/new', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await listPage.waitForTimeout(2500);
  out.pages_new = {
    url: listPage.url(),
    h1: (await listPage.locator('h1').allTextContents().catch(() => []))[0] ?? null,
    has_page_title_input: await listPage.locator('#page_title').count() > 0,
    mis_paginas_list_replacing: await listPage.evaluate(() => document.querySelector('h1')?.textContent?.trim() === 'Mis páginas'),
    navbars: await listPage.locator('header[data-platform-navbar]').count(),
    runtime_errors: listErrors,
  };

  // test_3: /pages/$pageId
  await listPage.goto(BASE + '/pages/' + PAGE_ID, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await listPage.waitForTimeout(3000);
  out.page_detail = {
    url: listPage.url(),
    h1: (await listPage.locator('h1').allTextContents().catch(() => []))[0] ?? null,
    has_promo_h1: await listPage.locator('h1', { hasText: 'Promo septiembre' }).count() > 0,
    has_qr_share: await listPage.getByRole('button', { name: 'QR / Compartir' }).count() > 0,
    mis_paginas_list_shown: await listPage.evaluate(() => document.body.innerText.includes('Mis páginas')),
    navbars: await listPage.locator('header[data-platform-navbar]').count(),
    not_found: await listPage.evaluate(() => /No se encontró esta página/i.test(document.body.innerText)),
    runtime_errors: listErrors,
  };

  // test_4: /pages/$pageId/edit
  await listPage.goto(BASE + '/pages/' + PAGE_ID + '/edit', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await listPage.waitForTimeout(4000);
  out.page_edit = {
    url: listPage.url(),
    editor_mounted: await listPage.evaluate(() => Boolean(document.querySelector('[data-testid="power-editor"], [data-testid="editor-shell"], .power-editor, [class*="editor"]'))),
    mis_paginas_list_shown: await listPage.evaluate(() => document.body.innerText.includes('Mis páginas')),
    body_snippet: (await listPage.evaluate(() => document.body.innerText)).slice(0, 200),
    runtime_errors: listErrors,
  };
  await listPage.close();

  // ============ PHASE 2 + 3 + 4: QR PANEL / PERSISTENCE / EXPORT ============
  const qrBefore = (await getPageRow()).qr_config;
  const profileBefore = await getProfileRow();
  out.qr = { before_qr_config: qrBefore };

  const qrPage = await context.newPage();
  const qrErrors = [];
  qrPage.on('console', (m) => { if (m.type() === 'error') qrErrors.push('console: ' + m.text()); });
  qrPage.on('pageerror', (e) => qrErrors.push('pageerror: ' + e.message));

  await qrPage.goto(BASE + '/pages/' + PAGE_ID, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await qrPage.waitForTimeout(3000);
  await qrPage.getByRole('button', { name: 'QR / Compartir' }).first().click();
  await qrPage.waitForTimeout(2000);

  const destText = await qrPage.evaluate(() => {
    const els = [...document.querySelectorAll('p')];
    const el = els.find((e) => (e.textContent || '').includes('/pg/'));
    return el ? el.textContent.trim() : null;
  });
  out.qr.panel = {
    destination: destText,
    destination_is_pg_yfLEdka: !!destText && destText.endsWith('/pg/' + PUBLIC_ID),
    forbidden_profile: !!destText && destText.includes('/p/' + PROFILE_PUBLIC_ID),
    forbidden_editor: !!destText && destText.includes('/editor'),
    forbidden_title_derived: !!destText && /promo|septiembre/i.test(destText),
    png_button: await qrPage.getByRole('button', { name: 'PNG' }).count() > 0,
    svg_button: await qrPage.getByRole('button', { name: 'SVG' }).count() > 0,
    save_button: await qrPage.getByRole('button', { name: /Guardar diseño/ }).count() > 0,
    canvas_present: await qrPage.evaluate(() => Boolean(document.getElementById('page-qr-code-canvas'))),
    svg_element_present: await qrPage.evaluate(() => Boolean(document.getElementById('page-qr-code-svg'))),
    runtime_errors: qrErrors,
  };

  // PHASE 3: mutate foreground color + save
  const NEW_COLOR = '#336699';
  await qrPage.locator('input[type="text"]').first().fill(NEW_COLOR);
  await qrPage.waitForTimeout(300);
  await qrPage.getByRole('button', { name: /Guardar diseño/ }).click();
  await qrPage.waitForTimeout(2000);
  out.qr.save = {
    success_toast: await qrPage.evaluate(() => document.body.innerText.includes('Diseño del QR guardado')),
    runtime_errors: qrErrors,
  };

  // database verify
  const qrAfterSave = (await getPageRow()).qr_config;
  out.qr.db_verify = {
    qr_config_after_save: qrAfterSave,
    matches_ui: JSON.stringify(qrAfterSave) === JSON.stringify({ qr_foreground_color: NEW_COLOR }),
  };

  // PHASE 3: refresh persistence
  await qrPage.reload({ waitUntil: 'domcontentloaded', timeout: 90000 });
  await qrPage.waitForTimeout(3000);
  await qrPage.getByRole('button', { name: 'QR / Compartir' }).first().click();
  await qrPage.waitForTimeout(2000);
  const fgAfterRefresh = await qrPage.locator('input[type="text"]').first().inputValue().catch(() => null);
  const destAfterRefresh = await qrPage.evaluate(() => {
    const els = [...document.querySelectorAll('p')];
    const el = els.find((e) => (e.textContent || '').includes('/pg/'));
    return el ? el.textContent.trim() : null;
  });
  out.qr.refresh = {
    foreground_value: fgAfterRefresh,
    persisted: fgAfterRefresh === NEW_COLOR,
    destination: destAfterRefresh,
    destination_still_pg_yfLEdka: !!destAfterRefresh && destAfterRefresh.endsWith('/pg/' + PUBLIC_ID),
    runtime_errors: qrErrors,
  };

  // PHASE 4: PNG + SVG export
  const dlDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qrqa-'));
  out.export = {};
  try {
    const [pngDl] = await Promise.all([
      qrPage.waitForEvent('download', { timeout: 20000 }),
      qrPage.getByRole('button', { name: 'PNG' }).click(),
    ]);
    const pngPath = path.join(dlDir, 'qr.png');
    await pngDl.saveAs(pngPath);
    const pngSize = fs.statSync(pngPath).size;
    out.export.png = { suggested: pngDl.suggestedFilename(), size: pngSize, non_empty: pngSize > 0 };
  } catch (e) {
    out.export.png = { error: String(e) };
  }
  try {
    const [svgDl] = await Promise.all([
      qrPage.waitForEvent('download', { timeout: 20000 }),
      qrPage.getByRole('button', { name: 'SVG' }).click(),
    ]);
    const svgPath = path.join(dlDir, 'qr.svg');
    await svgDl.saveAs(svgPath);
    const svgSize = fs.statSync(svgPath).size;
    out.export.svg = { suggested: svgDl.suggestedFilename(), size: svgSize, non_empty: svgSize > 0 };
  } catch (e) {
    out.export.svg = { error: String(e) };
  }
  out.export.runtime_errors = qrErrors;
  await qrPage.close();

  // ============ PHASE 5: MOBILE OWNER UI ============
  const mobilePage = await context.newPage();
  await mobilePage.setViewportSize({ width: 390, height: 844 });
  const mobileErrors = [];
  mobilePage.on('console', (m) => { if (m.type() === 'error') mobileErrors.push('console: ' + m.text()); });
  mobilePage.on('pageerror', (e) => mobileErrors.push('pageerror: ' + e.message));
  await mobilePage.goto(BASE + '/pages/' + PAGE_ID, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await mobilePage.waitForTimeout(3000);
  const overflow = await mobilePage.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  await mobilePage.getByRole('button', { name: 'QR / Compartir' }).first().click();
  await mobilePage.waitForTimeout(2000);
  out.mobile = {
    h1: (await mobilePage.locator('h1').allTextContents().catch(() => []))[0] ?? null,
    has_promo: await mobilePage.locator('h1', { hasText: 'Promo septiembre' }).count() > 0,
    qr_panel_open: await mobilePage.evaluate(() => document.body.innerText.includes('Destino del QR')),
    canvas_present: await mobilePage.evaluate(() => Boolean(document.getElementById('page-qr-code-canvas'))),
    png_reachable: await mobilePage.getByRole('button', { name: 'PNG' }).count() > 0,
    svg_reachable: await mobilePage.getByRole('button', { name: 'SVG' }).count() > 0,
    save_reachable: await mobilePage.getByRole('button', { name: /Guardar diseño/ }).count() > 0,
    horizontal_overflow: overflow.sw > overflow.cw + 1,
    scrollWidth: overflow.sw,
    clientWidth: overflow.cw,
    runtime_errors: mobileErrors,
  };
  await mobilePage.close();

  // ============ PHASE 6: DATA INVARIANTS (post) ============
  const pageAfter = await getPageRow();
  const profileAfter = await getProfileRow();
  out.data = {
    child: {
      published_revision: pageAfter.published_revision,
      published: pageAfter.published,
      public_id: pageAfter.public_id,
      title: pageAfter.title,
      page_type: pageAfter.page_type,
    },
    profile: {
      published_revision: profileAfter.published_revision,
      public_id: profileAfter.public_id,
    },
  };

  // ============ CLEANUP: restore qr_config to original (null) ============
  out.cleanup = { before_restore: (await getPageRow()).qr_config };
  if (JSON.stringify(qrBefore) !== JSON.stringify((await getPageRow()).qr_config)) {
    out.cleanup.restore = await patchPageQrConfig(qrBefore);
    await sleep(800);
    out.cleanup.after_restore = (await getPageRow()).qr_config;
  } else {
    out.cleanup.restore = { note: 'no change detected, nothing to restore' };
  }

  await browser.close();
  console.log(JSON.stringify(out, null, 2));
})().catch((e) => {
  console.log(JSON.stringify({ fatal: String(e) }, null, 2));
  process.exit(1);
});

