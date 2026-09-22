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

  // ---- PHASE 8 + 6: public child page, mobile viewport ----
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push("console: " + m.text());
    });
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
    const resp = await page.goto(BASE + "/pg/yfLEdka", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForTimeout(2000);
    const overflow = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      cw: document.documentElement.clientWidth,
    }));
    out.mobile = {
      route: "/pg/yfLEdka (390x844)",
      http: resp && resp.status(),
      renderer_mounted: await page.evaluate(
        () =>
          document.documentElement.innerHTML.includes("pts-") ||
          document.querySelector('[style*="--pts"]') !== null,
      ),
      editor_chrome: await page.evaluate(() =>
        Boolean(
          document.querySelector(
            '[data-testid="power-editor"], [data-testid="editor-shell"], .basic-editor-shell',
          ),
        ),
      ),
      error_boundary: await page.evaluate(() =>
        /error boundary|Something went wrong/i.test(document.body.innerText),
      ),
      horizontal_overflow: overflow.sw > overflow.cw,
      scrollWidth: overflow.sw,
      clientWidth: overflow.cw,
      runtime_errors: errors,
    };
    await page.close();
  }

  // ---- PHASE 8: 404 page ----
  {
    const page = await browser.newPage();
    const resp = await page.goto(BASE + "/pg/qa-does-not-exist", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    out.notfound = { http: resp && resp.status() };
    await page.close();
  }

  // ---- PHASE 2: PageQrPanel runtime (authenticated) ----
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push("console: " + m.text());
    });
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

    await page.goto(BASE + "/editor", { waitUntil: "domcontentloaded", timeout: 60000 });
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
    let authConfirmed = false;
    try {
      await page.waitForFunction(
        () =>
          /Canonical cargado|AÑADIR CONTENIDO|Perfil:|Vista previa/.test(document.body.innerText),
        { timeout: 25000 },
      );
      authConfirmed = true;
    } catch {
      authConfirmed = false;
    }
    out.auth_confirmed = authConfirmed;
    out.auth_cookie_sb = await page.evaluate(() => document.cookie.includes("sb-"));

    const resp = await page.goto(BASE + "/pages", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForTimeout(3000);
    out.pages_list = {
      http: resp && resp.status(),
      url_after: page.url(),
      has_promo: await page.evaluate(() => document.body.innerText.includes("Promo septiembre")),
      has_abrir_buttons: await page.getByRole("button", { name: "Abrir" }).count(),
      body_head: (await page.evaluate(() => document.body.innerText)).slice(0, 300),
    };

    // client-side navigate to the child page via the "Abrir" link
    const abrirLink = page.getByRole("link", { name: "Abrir" }).first();
    if ((await abrirLink.count()) > 0) {
      await abrirLink.click();
      await page.waitForTimeout(3000);
    }
    const allH1 = await page
      .locator("h1")
      .allTextContents()
      .catch(() => []);
    out.page_detail = {
      url_after: page.url(),
      h1_list: allH1,
      title: allH1[0] ?? null,
      has_qr_share_button: (await page.getByRole("button", { name: "QR / Compartir" }).count()) > 0,
      not_found_msg: await page.evaluate(() =>
        /No se encontró esta página/i.test(document.body.innerText),
      ),
    };

    if (out.page_detail.has_qr_share_button) {
      await page.getByRole("button", { name: "QR / Compartir" }).first().click();
      await page.waitForTimeout(2000);
      const bodyText = await page.evaluate(() => document.body.innerText);
      out.pageqr = {
        panel_loaded: bodyText.includes("Destino del QR") || bodyText.includes("QR de esta página"),
        destination_shown: bodyText.includes("/pg/yfLEdka"),
        destination_forbidden_profile: bodyText.includes("/p/sY9wHGm"),
        destination_forbidden_editor: bodyText.includes("/editor"),
        png_button: (await page.getByRole("button", { name: "PNG" }).count()) > 0,
        svg_button: (await page.getByRole("button", { name: "SVG" }).count()) > 0,
        save_button: (await page.getByRole("button", { name: /Guardar diseño/ }).count()) > 0,
        canvas_present: await page.evaluate(() =>
          Boolean(document.getElementById("page-qr-code-canvas")),
        ),
        svg_element_present: await page.evaluate(() =>
          Boolean(document.getElementById("page-qr-code-svg")),
        ),
        runtime_errors: errors,
      };
    }

    await page.close();
  }

  await browser.close();
  console.log(JSON.stringify(out, null, 2));
})().catch((e) => {
  console.log(JSON.stringify({ fatal: String(e) }, null, 2));
  process.exit(1);
});
