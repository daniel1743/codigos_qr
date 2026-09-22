const { chromium } = require("@playwright/test");
const fs = require("fs");

const env = {};
for (const l of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const BASE = "http://localhost:8080";
const PAGE_ID = "9a02efa0-f6de-4bf3-930f-edbed88c3e1e";
const PUBLIC_ID = "yfLEdka";
const PROFILE_PUBLIC_ID = "sY9wHGm";
const base = env.VITE_SUPABASE_URL;
const sr = env.SUPABASE_SERVICE_ROLE_KEY;
const srH = { apikey: sr, Authorization: "Bearer " + sr, "Content-Type": "application/json" };

async function getPageRow() {
  const r = await fetch(base + "/rest/v1/pages?select=*&public_id=eq." + PUBLIC_ID, {
    headers: srH,
  });
  return (await r.json())[0];
}
async function getProfileRow() {
  const r = await fetch(base + "/rest/v1/profiles?select=*&public_id=eq." + PROFILE_PUBLIC_ID, {
    headers: srH,
  });
  return (await r.json())[0];
}

(async () => {
  const out = {};
  const browser = await chromium.launch();

  // ---- public regression ----
  out.public = {};
  {
    const p = await browser.newPage();
    const r = await p.goto(BASE + "/pg/" + PUBLIC_ID, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    out.public.child = r && r.status();
    await p.close();
  }
  {
    const p = await browser.newPage();
    const r = await p.goto(BASE + "/p/" + PROFILE_PUBLIC_ID, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    out.public.profile = r && r.status();
    await p.close();
  }
  {
    const p = await browser.newPage();
    const r = await p.goto(BASE + "/pg/qa-does-not-exist", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    out.public.nonexistent = r && r.status();
    await p.close();
  }

  // ---- auth ----
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
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
  let authed = false;
  try {
    await ap.waitForFunction(() => document.cookie.includes("sb-"), { timeout: 30000 });
    authed = true;
  } catch {}
  out.auth = authed;
  await ap.close();
  if (!authed) {
    out.fatal = "auth failed";
    await browser.close();
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("console: " + m.text());
  });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  // ---- regression: /pages list ----
  await page.goto(BASE + "/pages", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(2500);
  out.pages_list = {
    has_mis_paginas: (await page.locator("h1", { hasText: "Mis páginas" }).count()) > 0,
    has_promo: await page.evaluate(() => document.body.innerText.includes("Promo septiembre")),
  };

  // ---- regression: /pages/new ----
  await page.goto(BASE + "/pages/new", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(2000);
  out.pages_new = {
    h1:
      (
        await page
          .locator("h1")
          .allTextContents()
          .catch(() => [])
      )[0] ?? null,
    has_input: (await page.locator("#page_title").count()) > 0,
  };

  // ---- regression: /pages/$pageId (PageDetail) ----
  await page.goto(BASE + "/pages/" + PAGE_ID, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(2500);
  out.page_detail = {
    h1:
      (
        await page
          .locator("h1")
          .allTextContents()
          .catch(() => [])
      )[0] ?? null,
    has_qr_share: (await page.getByRole("button", { name: "QR / Compartir" }).count()) > 0,
    navbars: await page.locator("header[data-platform-navbar]").count(),
  };

  // ---- THE FIX: /pages/$pageId/edit mounts PowerEditorHost ----
  await page.goto(BASE + "/pages/" + PAGE_ID + "/edit", {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  let editorMounted = false;
  let editorText = null;
  let editorAvailable = true;
  try {
    await page.waitForSelector('[data-testid="power-editor"]', { timeout: 60000 });
    editorMounted = true;
    editorText = await page.evaluate(
      () =>
        document.querySelector('[data-testid="power-editor-profile"]')?.textContent?.trim() ?? null,
    );
  } catch {
    editorMounted = false;
    editorAvailable = await page.evaluate(() =>
      document.body.innerText.includes("Power Editor no disponible"),
    );
  }
  await page.waitForTimeout(1500);
  const bodyText = await page.evaluate(() => document.body.innerText);
  out.page_edit = {
    url: page.url(),
    editor_mounted: editorMounted,
    editor_sr_target: editorText,
    page_target_confirmed:
      !!editorText && editorText.startsWith("Página:") && editorText.includes(PUBLIC_ID),
    profile_target_used: !!editorText && editorText.startsWith("Perfil:"),
    editor_not_available: editorAvailable,
    page_detail_marker_absent: !bodyText.includes("Volver a mis páginas"),
    details_card_absent: !bodyText.includes("ID público"),
    has_404: /404|No se encontró|Not Found/i.test(bodyText),
    error_boundary: /error boundary|Something went wrong/i.test(bodyText),
    navbars: await page.locator("header[data-platform-navbar]").count(),
    body_snippet: bodyText.slice(0, 160),
    runtime_errors: errors,
  };

  // ---- data invariants (read-only, no save) ----
  const pg = await getPageRow();
  const prf = await getProfileRow();
  out.data = {
    child: {
      published_revision: pg.published_revision,
      published: pg.published,
      public_id: pg.public_id,
      title: pg.title,
      page_type: pg.page_type,
      qr_config: pg.qr_config,
    },
    profile: { published_revision: prf.published_revision, public_id: prf.public_id },
  };

  await browser.close();
  console.log(JSON.stringify(out, null, 2));
})().catch((e) => {
  console.log(JSON.stringify({ fatal: String(e) }, null, 2));
  process.exit(1);
});
