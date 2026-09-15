/**
 * PAGES_7 — real runtime acceptance for the Page Generator → canonical Pages
 * pipeline.
 *
 * Real local dev server + real Supabase + real QA owner. It generates a child
 * Page from the existing Engine V2 generator, opens it in the current Power
 * Editor, saves, publishes, renders the public page, checks the QR destination
 * and the optional alias, then restores every temporary artefact it created.
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
const sr = env.SUPABASE_SERVICE_ROLE_KEY;
const srH = {
  apikey: sr,
  Authorization: "Bearer " + sr,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

const STAMP = Date.now();
const QA_TITLE = `QA PAGES_7 Menú ${STAMP}`;
const ALIAS = `qa-p7-${STAMP}`;
const SEO_TITLE = `QA P7 SEO ${STAMP}`;
const EDIT_HEX = "#1a2b3c";
const COVER = "https://picsum.photos/seed/cripqer-p7/1200/800";
const PROFILE_PUBLIC_ID = "sY9wHGm";
const EXISTING_CHILD_PUBLIC_ID = "yfLEdka";
const EXPECTED_PROFILE_REVISION = 4;
const EXPECTED_CHILD_REVISION = 3;

let createdPageId = null;

async function rest(path, options = {}) {
  const response = await fetch(base + "/rest/v1" + path, { headers: srH, ...options });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  return { status: response.status, payload };
}

const pageByPublicId = async (publicId) =>
  (await rest(`/pages?select=*&public_id=eq.${publicId}`)).payload?.[0] ?? null;
const profileByPublicId = async (publicId) =>
  (await rest(`/profiles?select=*&public_id=eq.${publicId}`)).payload?.[0] ?? null;

/** Poll the draft until the canonical save lands (autosave + save are async). */
async function waitForDraft(pageId, predicate, timeoutMs = 45000) {
  const started = Date.now();
  let last = null;
  while (Date.now() - started < timeoutMs) {
    last = (await rest(`/pages?select=*&id=eq.${pageId}`)).payload?.[0] ?? null;
    if (last && predicate(last)) return { matched: true, row: last, elapsed: Date.now() - started };
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return { matched: false, row: last, elapsed: Date.now() - started };
}

async function signIn(context) {
  const page = await context.newPage();
  await page.goto(BASE + "/editor", { waitUntil: "domcontentloaded", timeout: 90000 });
  try {
    await page.waitForSelector("#email", { timeout: 30000 });
  } catch {}
  if (await page.locator("#email").isVisible().catch(() => false)) {
    await page.locator("#email").fill(env.QA_EMAIL);
    await page.locator("#password").fill(env.QA_PASSWORD);
    await page.getByRole("button", { name: "Entrar al editor" }).click();
  }
  let authed = false;
  try {
    await page.waitForFunction(() => document.cookie.includes("sb-"), { timeout: 30000 });
    authed = true;
  } catch {}
  await page.close();
  return authed;
}

async function fillGeneratorForm(page) {
  await page.locator("#generated_business").fill("QA P7 Barbería");
  await page.locator("#generated_activity").fill("Barbería");
  await page
    .locator("#generated_description")
    .fill("Cortes y cuidado de barba, pedidos por WhatsApp.");
  await page.locator("#generated_cover").fill(COVER);
  // Primary CTA = WhatsApp with a QA-only number.
  await page.locator("#generated_cta").click();
  await page.getByRole("option", { name: "WhatsApp" }).click();
  await page.locator("#generated_cta_value").fill("+56912345678");
  // One owner-supplied item.
  await page.locator("#item-0-title").fill("Corte clásico");
  await page.locator("#item-0-description").fill("Máquina y tijera");
  await page.locator("#item-0-price").fill("$8.000");
}

/** Objectives render in GENERATED_PAGE_OBJECTIVES order: 0..5. */
const OBJECTIVE_INDEX = { services: 0, catalog: 1, portfolio: 2, menu: 3, promotion: 4, event: 5 };

async function pickObjective(page, objective) {
  await page.getByRole("button", { name: "Crear" }).nth(OBJECTIVE_INDEX[objective]).click();
}

(async () => {
  const out = { stamp: STAMP, qa_title: QA_TITLE };
  const browser = await chromium.launch();
  const profileBefore = await profileByPublicId(PROFILE_PUBLIC_ID);
  const existingChildBefore = await pageByPublicId(EXISTING_CHILD_PUBLIC_ID);

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  out.auth = await signIn(context);
  if (!out.auth) {
    out.fatal = "QA sign-in failed";
    await browser.close();
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  const page = await context.newPage();
  const runtimeErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error") runtimeErrors.push("console: " + m.text());
  });
  page.on("pageerror", (e) => runtimeErrors.push("pageerror: " + e.message));

  // ---------------------------------------------------------------- 1. entry UI
  await page.goto(BASE + "/pages/new", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(2500);
  const entryText = await page.evaluate(() => document.body.innerText);
  out.entry_ui = {
    h1: (await page.locator("h1").allTextContents())[0] ?? null,
    options_visible: [
      "Servicios",
      "Catálogo",
      "Portafolio",
      "Menú",
      "Promoción",
      "Evento",
      "Página simple",
    ].filter((label) => new RegExp(`^${label}$`, "m").test(entryText)),
    internal_jargon_visible: ["canonical", "BioTemplateConfig", "orchestrator", "adapter"].filter(
      (word) => entryText.toLowerCase().includes(word.toLowerCase()),
    ),
  };

  // ------------------------------------------- 2. services objective (canonical type)
  await pickObjective(page, "services");
  await page.waitForSelector("#generated_title", { timeout: 30000 });
  await page.locator("#generated_title").fill("QA P7 Servicios");
  await fillGeneratorForm(page);
  await page.getByRole("button", { name: "Generar servicios" }).click();
  await page.waitForTimeout(9000);
  const servicesRows = (
    await rest(`/pages?select=id,page_type&title=eq.${encodeURIComponent("QA P7 Servicios")}`)
  ).payload;
  const servicesText = await page.evaluate(() => document.body.innerText);
  out.services_runtime = {
    navigated_to_editor: /\/pages\/[0-9a-f-]+\/edit/.test(page.url()),
    blocked_message: /violates check constraint|no se pudo crear/i.test(servicesText),
    rows_created: Array.isArray(servicesRows) ? servicesRows.length : null,
    note: "PageType extension migration not applied on this project yet.",
  };

  // ----------------------------------------------------- 3. menú objective (end to end)
  await page.goto(BASE + "/pages/new", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(2000);
  await pickObjective(page, "menu");
  await page.waitForSelector("#generated_title", { timeout: 30000 });
  await page.locator("#generated_title").fill(QA_TITLE);
  await fillGeneratorForm(page);
  await page.getByRole("button", { name: "Generar menú" }).click();

  let editorMounted = false;
  try {
    await page.waitForURL(/\/pages\/[0-9a-f-]+\/edit/, { timeout: 60000 });
    await page.waitForSelector('[data-testid="power-editor"]', { timeout: 60000 });
    editorMounted = true;
  } catch {}
  await page.waitForTimeout(2500);

  const rows = (await rest(`/pages?select=*&title=eq.${encodeURIComponent(QA_TITLE)}`)).payload;
  const created = Array.isArray(rows) ? rows[0]: null;
  createdPageId = created?.id ?? null;
  out.generation = {
    editor_mounted: editorMounted,
    url: page.url(),
    page_id: createdPageId,
    public_id: created?.public_id ?? null,
    page_type: created?.page_type ?? null,
    owner_matches_qa_user: created?.owner_user_id === profileBefore?.user_id,
    profile_matches: created?.profile_id === profileBefore?.id,
    published: created?.published ?? null,
    has_canonical_envelope: created?.template_config?.schemaVersion === 1,
  };

  const editorConfig = created?.template_config?.editorConfig;
  out.canonical = {
    page_instance_id: editorConfig?.pageInstanceId ?? null,
    theme_colors: Boolean(editorConfig?.theme?.colors),
    theme_typography: Boolean(editorConfig?.theme?.typography),
    layout_responsive: Boolean(editorConfig?.layout?.responsive),
    blocks: Array.isArray(editorConfig?.blocks) ? editorConfig.blocks.map((b) => b.type) : null,
    carries_owner_item: JSON.stringify(editorConfig ?? {}).includes("Corte clásico"),
    carries_owner_price: JSON.stringify(editorConfig ?? {}).includes("$8.000"),
    carries_owner_cta: JSON.stringify(editorConfig ?? {}).includes("+56912345678"),
  };

  // ----------------------------------------------------- 4. editor round trip
  // "Diseño" → theme colours are a canonical domain the frozen entitlement guard
  // authorizes for every tier (EDIT_BASIC_STYLE owns "theme").
  await page.getByRole("button", { name: "Diseño", exact: true }).click();
  await page.waitForTimeout(1200);
  const primaryColorInput = page.locator('aside input[type="text"]').first();
  out.editor_form = { primary_before: await primaryColorInput.inputValue() };
  await primaryColorInput.fill(EDIT_HEX);
  await page.waitForTimeout(1500);
  out.editor_form.primary_after_typing = await primaryColorInput.inputValue();

  await page.locator('button[title="Guardar"]').click();
  let saveSignal = null;
  try {
    await page.waitForFunction(
      () =>
        (document.querySelector('[data-testid="power-editor-save-status"]')?.textContent ?? "")
          .trim()
          .match(/Guardado|Publicado/),
      undefined,
      { timeout: 30000 },
    );
    saveSignal = "saved";
  } catch {
    saveSignal = "timeout";
  }
  const draftWait = await waitForDraft(createdPageId, (row) =>
    JSON.stringify(row.template_config?.editorConfig?.theme?.colors ?? {})
      .toLowerCase()
      .includes("1a2b3c"),
  );
  const savedConfig = draftWait.row?.template_config?.editorConfig;
  out.editor_save = {
    save_signal: saveSignal,
    draft_wait_matched: draftWait.matched,
    draft_wait_elapsed_ms: draftWait.elapsed,
    save_status: await page.evaluate(
      () =>
        document.querySelector('[data-testid="power-editor-save-status"]')?.textContent?.trim() ??
        null,
    ),
    theme_primary_in_db: savedConfig?.theme?.colors?.primary ?? null,
    draft_persisted: JSON.stringify(savedConfig?.theme?.colors ?? {})
      .toLowerCase()
      .includes("1a2b3c"),
    generated_content_survived: JSON.stringify(savedConfig?.blocks ?? []).includes("Corte clásico"),
    published_still_false: draftWait.row?.published === false,
  };

  await page.reload({ waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector('[data-testid="power-editor"]', { timeout: 60000 });
  await page.getByRole("button", { name: "Diseño", exact: true }).click();
  await page.waitForTimeout(1800);
  out.editor_reload = {
    primary_input: await page.locator('aside input[type="text"]').first().inputValue(),
    generated_content_visible: (await page.evaluate(() => document.body.innerText)).includes(
      "Corte clásico",
    ),
  };

  // ------------------------------------------------------------ 5. publish
  await page.getByRole("button", { name: "Publicar" }).first().click();
  await page.waitForTimeout(6000);
  const afterPublish = (await rest(`/pages?select=*&id=eq.${createdPageId}`)).payload?.[0] ?? null;
  const publishedPublicId = afterPublish?.public_id ?? null;
  out.publish = {
    published: afterPublish?.published ?? null,
    published_revision: afterPublish?.published_revision ?? null,
    has_published_snapshot: Boolean(afterPublish?.published_template_config),
    snapshot_equals_draft:
      JSON.stringify(afterPublish?.published_template_config) ===
      JSON.stringify(afterPublish?.template_config),
    snapshot_is_canonical: afterPublish?.published_template_config?.schemaVersion === 1,
    published_snapshot_has_editor_edit: JSON.stringify(
      afterPublish?.published_template_config ?? {},
    )
      .toLowerCase()
      .includes("1a2b3c"),
  };

  // --------------------------------------------------- 6. public renderer
  const publicPage = await browser.newPage();
  const publicErrors = [];
  publicPage.on("pageerror", (e) => publicErrors.push(e.message));
  const publicResponse = await publicPage.goto(BASE + "/pg/" + publishedPublicId, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await publicPage.waitForTimeout(3000);
  out.public_render = {
    http: publicResponse ? publicResponse.status() : null,
    content_visible: await publicPage.evaluate(
      (name) => document.body.innerText.includes(name),
      "Corte clásico",
    ),
    title_visible: await publicPage.evaluate(
      (title) => document.body.innerText.includes(title),
      QA_TITLE,
    ),
    editor_chrome: await publicPage.evaluate(() =>
      Boolean(document.querySelector('[data-testid="power-editor"], aside')),
    ),
    runtime_errors: publicErrors,
  };
  await publicPage.close();

  // ------------------------------------------------------- 7. QR destination
  await page.goto(BASE + "/pages/" + createdPageId, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(2500);
  await page.getByRole("button", { name: "QR / Compartir" }).click();
  await page.waitForTimeout(3000);
  const detailText = await page.evaluate(() => document.body.innerText);
  out.child_identity = {
    qr_panel_open: /QR de esta página/.test(detailText),
    qr_destination_is_stable_route: detailText.includes(`/pg/${publishedPublicId}`),
    public_id_shown: detailText.includes(publishedPublicId),
  };

  // ------------------------------------------------------ 8. optional alias
  await page.locator("#page_alias").fill(ALIAS);
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await page.waitForTimeout(2500);
  const aliasPage = await browser.newPage();
  const aliasErrors = [];
  aliasPage.on("pageerror", (e) => aliasErrors.push(e.message));
  const aliasResponse = await aliasPage.goto(BASE + "/pg/a/" + ALIAS, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await aliasPage.waitForTimeout(2500);
  out.alias = {
    http: aliasResponse ? aliasResponse.status() : null,
    same_content: await aliasPage.evaluate(
      (name) => document.body.innerText.includes(name),
      "Corte clásico",
    ),
    runtime_errors: aliasErrors,
  };
  await aliasPage.close();

  // -------------------------------------------------- 9. mobile viewports
  out.mobile = {};
  for (const viewport of [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
  ]) {
    const mobileContext = await browser.newContext({ viewport });
    const generatorPage = await mobileContext.newPage();
    const generatorErrors = [];
    generatorPage.on("pageerror", (e) => generatorErrors.push(e.message));
    await generatorPage.goto(BASE + "/pages/new", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await generatorPage.waitForTimeout(2500);
    const generatorOverflow = await generatorPage.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    const generatorUsable = (await generatorPage.locator("button").count()) > 0;

    const mobilePublic = await mobileContext.newPage();
    const publicMobileErrors = [];
    mobilePublic.on("pageerror", (e) => publicMobileErrors.push(e.message));
    await mobilePublic.goto(BASE + "/pg/" + publishedPublicId, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await mobilePublic.waitForTimeout(2500);
    const publicOverflow = await mobilePublic.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    const ctaReachable = await mobilePublic.evaluate(
      (number) => document.body.innerHTML.includes(number),
      "+56912345678",
    );

    out.mobile[`${viewport.width}x${viewport.height}`] = {
      generator_overflow: generatorOverflow,
      generator_usable: generatorUsable,
      public_overflow: publicOverflow,
      cta_reachable: ctaReachable,
      runtime_errors: [...generatorErrors, ...publicMobileErrors],
    };

    await mobilePublic.close();
    await mobileContext.close();
  }



  // ------------------------------------------------- 10. regression checks
  const profileAfter = await profileByPublicId(PROFILE_PUBLIC_ID);
  const existingChildAfter = await pageByPublicId(EXISTING_CHILD_PUBLIC_ID);
  out.regressions = {
    profile_public_id: profileAfter?.public_id,
    profile_revision_unchanged: profileAfter?.published_revision === EXPECTED_PROFILE_REVISION,
    profile_slug_unchanged: profileAfter?.slug === profileBefore?.slug,
    profile_canonical_unchanged:
      JSON.stringify(profileAfter?.template_config) ===
      JSON.stringify(profileBefore?.template_config),
    existing_child_revision_unchanged:
      existingChildAfter?.published_revision === EXPECTED_CHILD_REVISION,
    existing_child_slug_unchanged: existingChildAfter?.slug === existingChildBefore?.slug,
    existing_child_canonical_unchanged:
      JSON.stringify(existingChildAfter?.template_config) ===
      JSON.stringify(existingChildBefore?.template_config),
    existing_child_qr_unchanged:
      JSON.stringify(existingChildAfter?.qr_config) ===
      JSON.stringify(existingChildBefore?.qr_config),
  };

  // ------------------------------------------------------- 11. QA cleanup
  if (createdPageId) {
    out.cleanup = {
      page_deleted: (await rest(`/pages?id=eq.${createdPageId}`, { method: "DELETE" })).status,
    };
  }
  const leftover = await rest(
    `/pages?select=id,title&or=(title.like.QA%20PAGES_7*,title.eq.${encodeURIComponent("QA P7 Servicios")})`,
  );
  out.cleanup = {
    ...(out.cleanup ?? {}),
    qa_rows_left: Array.isArray(leftover.payload) ? leftover.payload.length : null,
  };

  await browser.close();
  console.log(JSON.stringify({ ...out, runtime_errors: runtimeErrors }, null, 2));
})().catch((error) => {
  console.log(JSON.stringify({ fatal: String(error) }, null, 2));
  process.exit(1);
});
