/**
 * PAGES_7B — runtime verification for the new canonical PageTypes
 * (services / catalog / portfolio) plus QR, alias, mobile, Bio→child and
 * regression checks. Part 1/6: environment, constants, helpers, sign-in.
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
const COVER = "https://picsum.photos/seed/cripqer-p7b-cover/1200/800";
const IMG = (seed) => `https://picsum.photos/seed/cripqer-p7b-${seed}/800/600`;
const WHATSAPP = "+56912345678";
const PROFILE_PUBLIC_ID = "sY9wHGm";
const EXISTING_CHILD_PUBLIC_ID = "yfLEdka";

const OBJECTIVES = [
  {
    key: "services",
    index: 0,
    title: `QA PAGES_7B Servicios ${STAMP}`,
    button: "Generar servicios",
    cover: "",
    cta: { name: "WhatsApp", value: WHATSAPP },
    items: [
      { title: "Corte clásico", description: "Máquina y tijera", price: "$8.000" },
      { title: "Perfilado de barba" },
    ],
  },
  {
    key: "catalog",
    index: 1,
    title: `QA PAGES_7B Catálogo ${STAMP}`,
    button: "Generar catálogo",
    cover: COVER,
    cta: { name: "Sitio web", value: "https://qa-cripqer.example/catalogo" },
    items: [
      {
        title: "Cinturón de cuero",
        price: "$19.990",
        imageUrl: IMG("cinturon"),
        url: "https://qa-cripqer.example/cinturon",
      },
      { title: "Billetera de cuero", price: "$24.990", imageUrl: IMG("billetera") },
    ],
  },
  {
    key: "portfolio",
    index: 2,
    title: `QA PAGES_7B Portafolio ${STAMP}`,
    button: "Generar portafolio",
    cover: COVER,
    cta: { name: "WhatsApp", value: WHATSAPP },
    items: [
      {
        title: "Boda en Valparaíso",
        description: "Reportaje completo",
        imageUrl: IMG("boda"),
        url: "https://qa-cripqer.example/boda",
      },
    ],
  },
];

const CONTENT_EXPECTATIONS = {
  services: { must_include: ["Corte clásico", "Perfilado de barba", "$8.000"] },
  catalog: { must_include: ["Cinturón de cuero", "$19.990", "Billetera de cuero"] },
  portfolio: { must_include: ["Boda en Valparaíso"] },
};

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

async function pageByPublicId(publicId) {
  return (await rest(`/pages?select=*&public_id=eq.${publicId}`)).payload?.[0] ?? null;
}

async function profileByPublicId(publicId) {
  const select = "id,public_id,slug,published_revision,template_config";
  return (await rest(`/profiles?select=${select}&public_id=eq.${publicId}`)).payload?.[0] ?? null;
}

function digest(value) {
  const text = JSON.stringify(value ?? null);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${text.length}:${(hash >>> 0).toString(16)}`;
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

/** Part 2/6: generator form, generation (DB-verified) and editor publish. */

async function fillGeneratorForm(page, objective) {
  await page.locator("#generated_business").fill("QA P7B Barbería");
  await page.locator("#generated_activity").fill("Barbería");
  await page
    .locator("#generated_description")
    .fill("Contenido de prueba generado para verificación de PAGES_7B.");
  if (objective.cover) await page.locator("#generated_cover").fill(objective.cover);
  await page.locator("#generated_cta").click();
  await page.getByRole("option", { name: objective.cta.name, exact: true }).click();
  await page.locator("#generated_cta_value").fill(objective.cta.value);

  for (let index = 0; index < objective.items.length; index += 1) {
    if (index > 0) {
      await page.getByRole("button", { name: "Añadir otro" }).click();
      await page.waitForTimeout(400);
    }
    const item = objective.items[index];
    const fields = ["title", "description", "price", "imageUrl", "url"];
    for (const field of fields) {
      if (item[field] === undefined) continue;
      const input = page.locator(`#item-${index}-${field}`);
      if ((await input.count()) === 0) continue;
      await input.fill(item[field]);
    }
  }
}

async function findPageByTitle(title) {
  const query = `/pages?select=*&title=eq.${encodeURIComponent(title)}`;
  return (await rest(query)).payload?.[0] ?? null;
}

async function waitForPageRow(title, timeoutMs = 45000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const row = await findPageByTitle(title);
    if (row) return row;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return null;
}

/** Submits the generator form and verifies the canonical row through the DB. */
async function generateObjective(page, objective) {
  const result = { objective: objective.key };
  await page.goto(BASE + "/pages/new", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(2500);
  await page.getByRole("button", { name: "Crear" }).nth(objective.index).click();
  await page.waitForSelector("#generated_title", { timeout: 30000 });
  await page.locator("#generated_title").fill(objective.title);
  await fillGeneratorForm(page, objective);
  // The create + canonical save complete BEFORE the app redirects to the heavy
  // editor route. Blocking that redirect keeps this phase light (and the editor
  // is exercised in its own dedicated session).
  const blockEditor = (route) => route.abort();
  await page.route("**/pages/*/edit*", blockEditor);
  await page.getByRole("button", { name: objective.button }).click();

  const row = await waitForPageRow(objective.title);
  await page.unroute("**/pages/*/edit*", blockEditor);
  const config = row ? row.template_config?.editorConfig : null;
  result.page_id = row ? row.id : null;
  result.public_id = row ? row.public_id : null;
  result.page_type = row ? row.page_type : null;
  result.owner_user_id = row ? row.owner_user_id : null;
  result.canonical = {
    schema_version: row ? row.template_config?.schemaVersion : null,
    theme_colors: Boolean(config && config.theme && config.theme.colors),
    theme_typography: Boolean(config && config.theme && config.theme.typography),
    layout_responsive: Boolean(config && config.layout && config.layout.responsive),
    blocks: config && Array.isArray(config.blocks) ? config.blocks.map((b) => b.type) : null,
    owner_items_present: objective.items.every((item) =>
      JSON.stringify(config || {}).includes(item.title),
    ),
    published: row ? row.published : null,
  };
  return result;
}

/** Opens the page in the existing Power Editor and publishes the snapshot. */
async function openEditorAndPublish(page, pageId) {
  await page.goto(BASE + "/pages/" + pageId + "/edit", {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  let editorMounted = false;
  try {
    await page.waitForSelector('[data-testid="power-editor"]', { timeout: 60000 });
    editorMounted = true;
  } catch {}
  const editorTarget = await page
    .evaluate(() => {
      const node = document.querySelector('[data-testid="power-editor-profile"]');
      return node ? node.textContent.trim() : null;
    })
    .catch(() => null);

  let published = null;
  if (editorMounted) {
    await page.getByRole("button", { name: "Publicar" }).first().click();
    await page.waitForTimeout(6000);
    const row = (await rest(`/pages?select=*&id=eq.${pageId}`)).payload?.[0] ?? null;
    published = {
      published: row ? row.published : null,
      published_revision: row ? row.published_revision : null,
      has_published_snapshot: Boolean(row && row.published_template_config),
      snapshot_is_canonical: Boolean(
        row && row.published_template_config && row.published_template_config.schemaVersion === 1,
      ),
      snapshot_equals_draft:
        JSON.stringify(row ? row.published_template_config : null) ===
        JSON.stringify(row ? row.template_config : null),
    };
  }
  return { editor_mounted: editorMounted, editor_target: editorTarget, published };
}

/** Part 3/6: real SSR public-route checks (no browser) + light mobile pass. */

async function fetchPublicPage(publicId) {
  const response = await fetch(BASE + "/pg/" + publicId, { redirect: "manual" });
  const html = await response.text();
  return { status: response.status, html };
}

function isHostActionHref(href) {
  return (
    href.indexOf("wa.me") >= 0 ||
    href.indexOf("whatsapp") >= 0 ||
    href.indexOf("qa-cripqer.example") >= 0
  );
}

async function inspectPublicPage(publicId, expectation) {
  const { status, html } = await fetchPublicPage(publicId);
  const hrefs = Array.from(html.matchAll(/href="([^"]+)"/g)).map((match) => match[1]);
  const imageSources = Array.from(html.matchAll(/<img[^>]+src="([^"]+)"/g)).map(
    (match) => match[1],
  );
  return {
    http: status,
    renderer_mounted: html.includes("pts-") || html.includes("<main"),
    editor_chrome: html.includes('data-testid="power-editor"'),
    content_visible: expectation.must_include.filter((text) => html.includes(text)),
    content_missing: expectation.must_include.filter((text) => !html.includes(text)),
    host_action_hrefs: hrefs.filter(isHostActionHref),
    owner_images: imageSources.filter((source) => source.includes("cripqer-p7b-")).length,
    html_bytes: html.length,
  };
}

async function checkMobile(page, publicId) {
  const out = {};
  const sizes = [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
  ];
  for (const viewport of sizes) {
    await page.setViewportSize(viewport);
    const response = await page.goto(BASE + "/pg/" + publicId, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await page.waitForTimeout(2000);
    const html = await page.evaluate(() => document.body.innerHTML);
    out[`${viewport.width}x${viewport.height}`] = {
      http: response ? response.status() : null,
      overflow: await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
      cta_reachable: html.includes(WHATSAPP) || html.includes("qa-cripqer.example"),
    };
  }
  return out;
}

/** Part 4/6: phases (generate / editor+publish / mobile) and QR, alias, Bio→child. */

function objectivesForSelection(selection) {
  if (!selection || selection === "all") return OBJECTIVES;
  return OBJECTIVES.filter((objective) => objective.key === selection);
}

async function step(label, out, run) {
  try {
    return await run();
  } catch (error) {
    out.errors = out.errors || [];
    out.errors.push(`${label}: ${String(error).split("\n")[0]}`);
    return null;
  }
}

async function findGeneratedPage(label) {
  const encoded = encodeURIComponent(`QA PAGES_7B ${label}*`);
  const query = `/pages?select=id,public_id,page_type,title&title=like.${encoded}`;
  const row = (await rest(query)).payload?.[0] ?? null;
  if (!row) return null;
  return { page_id: row.id, public_id: row.public_id, page_type: row.page_type, title: row.title };
}

async function collectGeneratedPages() {
  const labels = { services: "Servicios", catalog: "Catálogo", portfolio: "Portafolio" };
  const pages = {};
  for (const objective of OBJECTIVES) {
    const found = await findGeneratedPage(labels[objective.key]);
    if (found) pages[objective.key] = found;
  }
  return pages;
}

async function runQrAndAlias(page, out) {
  const services =
    (out.generated && out.generated.services) || (await findGeneratedPage("Servicios"));
  if (!services || !services.page_id) return out;

  await page.goto(BASE + "/pages/" + services.page_id, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(2500);
  await page.getByRole("button", { name: "QR / Compartir" }).click();
  await page.waitForTimeout(3000);
  const detailText = await page.evaluate(() => document.body.innerText);
  out.qr = {
    public_id: services.public_id,
    panel_open: detailText.indexOf("QR de esta p") >= 0,
    destination_is_stable_route: detailText.indexOf(`/pg/${services.public_id}`) >= 0,
    public_id_shown: detailText.indexOf(services.public_id) >= 0,
  };

  const alias = `qa-p7b-${STAMP}`;
  await page.locator("#page_alias").fill(alias);
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await page.waitForTimeout(2500);
  const aliasFetch = await fetchPublicPage(`a/${alias}`);
  out.alias = {
    slug: alias,
    http: aliasFetch.status,
    same_content: aliasFetch.html.includes("Corte clásico"),
  };
  return out;
}

/** Part 5/8: Bio → child link capability proof (no primary-profile mutation). */

const CANONICAL_ORIGIN = "https://www.cripqer.dev";

async function runBioLinking(page, out) {
  const linkHostUrls = {};
  const pages =
    out.generated && out.generated.services ? out.generated : await collectGeneratedPages();
  for (const objective of OBJECTIVES) {
    const generated = pages[objective.key];
    if (generated && generated.public_id) {
      linkHostUrls[objective.key] = `/pg/${generated.public_id}`;
    }
  }
  if (Object.keys(linkHostUrls).length !== 3) {
    out.bio_linking = { skipped: "missing generated pages", targets: linkHostUrls };
    return out;
  }

  const services = pages.services;
  const sourceQuery = `/pages?select=published_template_config&id=eq.${services.page_id}`;
  const sourceRow = (await rest(sourceQuery)).payload?.[0];
  const envelope = sourceRow ? sourceRow.published_template_config : null;
  if (!envelope) {
    out.bio_linking = { skipped: "no published snapshot to copy blocks from" };
    return out;
  }

  const ctaBlock = envelope.editorConfig.blocks.find((block) => block.type === "cta");
  const makeBlock = (key, suffix, url) => ({
    ...ctaBlock,
    id: `qa-bio-link-${suffix}-${key}`,
    content: { ...ctaBlock.content, title: `Ver ${key}`, label: `Ir a ${key}`, url },
  });

  const absoluteUrls = {};
  const linkBlocks = [];
  for (const [key, relative] of Object.entries(linkHostUrls)) {
    absoluteUrls[key] = CANONICAL_ORIGIN + relative;
    linkBlocks.push(makeBlock(key, "abs", absoluteUrls[key]));
    linkBlocks.push(makeBlock(key, "rel", relative));
  }

  const hostEnvelope = {
    schemaVersion: 1,
    editorConfig: {
      ...envelope.editorConfig,
      pageInstanceId: `qa-bio-link-host-${STAMP}`,
      blocks: [...envelope.editorConfig.blocks, ...linkBlocks],
    },
  };

  const identityQuery = `/profiles?select=id,user_id&public_id=eq.${PROFILE_PUBLIC_ID}`;
  const identity = (await rest(identityQuery)).payload?.[0];
  const hostRow = (
    await rest("/pages", {
      method: "POST",
      body: JSON.stringify({
        owner_user_id: identity.user_id,
        profile_id: identity.id,
        title: `QA PAGES_7B Link host ${STAMP}`,
        page_type: "landing",
        template_config: hostEnvelope,
        published_template_config: null,
        published: false,
        published_revision: 0,
        slug: null,
      }),
    })
  ).payload?.[0];

  await page.goto(BASE + "/pages/" + hostRow.id + "/edit", {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  let hostEditor = false;
  try {
    await page.waitForSelector('[data-testid="power-editor"]', { timeout: 60000 });
    hostEditor = true;
  } catch {}
  await page.getByRole("button", { name: "Publicar" }).first().click();
  await page.waitForTimeout(6000);
  const hostAfter = (await rest(`/pages?select=*&id=eq.${hostRow.id}`)).payload?.[0] ?? null;

  const hostFetch = await fetchPublicPage(hostAfter.public_id);
  const hrefs = Array.from(hostFetch.html.matchAll(/href="([^"]*)"/g)).map((match) => match[1]);
  const observations = {};
  for (const [key, relative] of Object.entries(linkHostUrls)) {
    observations[key] = {
      absolute_url: absoluteUrls[key],
      absolute_rendered: hrefs.includes(absoluteUrls[key]),
      relative_target: relative,
      relative_rendered: hrefs.includes(relative),
      relative_observed_as:
        hrefs.find((href) => href.indexOf(relative.replace(/^\//, "")) >= 0) ?? null,
    };
  }

  out.bio_linking = {
    host_page_id: hostRow.id,
    host_public_id: hostAfter ? hostAfter.public_id : null,
    host_editor_accepted_document: hostEditor,
    host_published: hostAfter ? hostAfter.published : null,
    host_publish_http: hostFetch.status,
    canonical_origin: CANONICAL_ORIGIN,
    observations,
  };
  return out;
}

/** Part 6/8: browser session helper, regression checks, QA cleanup. */

const LAUNCH_ARGS = [
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--disable-extensions",
  "--disable-background-networking",
];

async function withBrowser(run) {
  const browser = await chromium.launch({ args: LAUNCH_ARGS });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    page.on("pageerror", (error) => errors.push("pageerror: " + error.message));
    const value = await run({ browser, page, context });
    return { value, errors };
  } finally {
    await browser.close().catch(() => {});
  }
}

async function runRegressions(before, out) {
  const after = {
    profile: await profileByPublicId(PROFILE_PUBLIC_ID),
    child: await pageByPublicId(EXISTING_CHILD_PUBLIC_ID),
  };
  out.regressions = {
    profile_revision: after.profile ? after.profile.published_revision : null,
    profile_revision_unchanged: Boolean(
      after.profile &&
        before.profile &&
        after.profile.published_revision === before.profile.published_revision,
    ),
    profile_slug_unchanged: Boolean(
      after.profile && before.profile && after.profile.slug === before.profile.slug,
    ),
    profile_canonical_unchanged:
      digest(after.profile ? after.profile.template_config : null) ===
      digest(before.profile ? before.profile.template_config : null),
    child_revision: after.child ? after.child.published_revision : null,
    child_revision_unchanged: Boolean(
      after.child &&
        before.child &&
        after.child.published_revision === before.child.published_revision,
    ),
    child_slug_unchanged: Boolean(
      after.child && before.child && after.child.slug === before.child.slug,
    ),
    child_canonical_unchanged:
      digest(after.child ? after.child.template_config : null) ===
      digest(before.child ? before.child.template_config : null),
    child_published_unchanged:
      digest(after.child ? after.child.published_template_config : null) ===
      digest(before.child ? before.child.published_template_config : null),
    child_qr_unchanged:
      digest(after.child ? after.child.qr_config : null) ===
      digest(before.child ? before.child.qr_config : null),
  };
  return out;
}

async function runCleanup(out) {
  const qaRows = (await rest("/pages?select=id,public_id,title&title=like.QA*")).payload || [];
  const deletions = [];
  for (const row of qaRows) {
    const response = await rest(`/pages?id=eq.${row.id}`, { method: "DELETE" });
    deletions.push({ public_id: row.public_id, status: response.status });
  }
  const leftover = (await rest("/pages?select=id&title=like.QA*")).payload || [];
  out.cleanup = { deleted: deletions.length, leftovers: leftover.length, deletions };
  return out;
}

/** Read a small control file (mode / phase / objective). */
function readControl(name, fallback) {
  try {
    const raw = fs.readFileSync(`scratch/p7b-${name}.txt`, "utf8").trim();
    return raw || fallback;
  } catch {
    return fallback;
  }
}

function readMode() {
  return readControl("mode", "all");
}

function readPhase() {
  return readControl("phase", "all");
}

/** Newest QA page for one objective, read straight from the canonical table. */
async function newestQaPage(key) {
  const labels = { services: "Servicios", catalog: "Catálogo", portfolio: "Portafolio" };
  const encoded = encodeURIComponent(`QA PAGES_7B ${labels[key]}*`);
  const query = `/pages?select=*&title=like.${encoded}&order=created_at.desc&limit=1`;
  const row = (await rest(query)).payload?.[0] ?? null;
  if (!row) return null;
  const config = row.template_config ? row.template_config.editorConfig : null;
  return {
    page_id: row.id,
    public_id: row.public_id,
    page_type: row.page_type,
    title: row.title,
    owner_user_id: row.owner_user_id,
    published: row.published,
    published_revision: row.published_revision,
    canonical: {
      schema_version: row.template_config ? row.template_config.schemaVersion : null,
      theme_colors: Boolean(config && config.theme && config.theme.colors),
      theme_typography: Boolean(config && config.theme && config.theme.typography),
      layout_responsive: Boolean(config && config.layout && config.layout.responsive),
      blocks: config && Array.isArray(config.blocks) ? config.blocks.map((b) => b.type) : null,
      block_count: config && Array.isArray(config.blocks) ? config.blocks.length : 0,
    },
    published_snapshot_is_canonical: Boolean(
      row.published_template_config && row.published_template_config.schemaVersion === 1,
    ),
    published_snapshot_equals_draft:
      JSON.stringify(row.published_template_config) === JSON.stringify(row.template_config),
  };
}

/** Part 8/8: phase-driven runner and entry point. */

async function runPhase(mode, phase, out) {
  const objective = OBJECTIVES.find((item) => item.key === mode);
  if (mode !== "extras" && !objective) {
    out.fatal = `unknown objective: ${mode}`;
    return out;
  }

  if (mode === "extras") {
    const before = {
      profile: await profileByPublicId(PROFILE_PUBLIC_ID),
      child: await pageByPublicId(EXISTING_CHILD_PUBLIC_ID),
    };
    out.pages = await collectGeneratedPages();

    if (phase === "cleanup") {
      await runCleanup(out);
      await runRegressions(before, out);
      return out;
    }

    const session = await withBrowser(async ({ page, context }) => {
      out.auth = await signIn(context);
      if (!out.auth) return null;
      if (phase === "qr" || phase === "all") {
        await step("qr-alias", out, () => runQrAndAlias(page, out));
      }
      if (phase === "bio" || phase === "all") {
        await step("bio-linking", out, () => runBioLinking(page, out));
      }
      return true;
    });
    out.runtime_errors = session.errors;
    await runRegressions(before, out);
    if (phase === "all") await runCleanup(out);
    return out;
  }

  if (phase === "generate" || phase === "all") {
    const session = await step("generate", out, () =>
      withBrowser(async ({ page, context }) => {
        out.auth = await signIn(context);
        if (!out.auth) return null;
        return generateObjective(page, objective);
      }),
    );
    out.generated = session && session.value ? session.value : null;
    if (session) out.runtime_errors = session.errors;
  }

  const page = await step("lookup", out, () => newestQaPage(mode));
  out.page = page;
  if (!page || !page.page_id) return out;

  if (phase === "public" || phase === "all") {
    out.public = await step("public", out, () =>
      inspectPublicPage(page.public_id, CONTENT_EXPECTATIONS[mode]),
    );
  }

  if (phase === "editor" || phase === "all") {
    const session = await step("editor", out, () =>
      withBrowser(async ({ page: editorPage, context }) => {
        out.auth = await signIn(context);
        return openEditorAndPublish(editorPage, page.page_id);
      }),
    );
    out.editor = session && session.value ? session.value : null;
    if (session) out.runtime_errors = (out.runtime_errors || []).concat(session.errors);
  }

  if (phase === "mobile" || phase === "all") {
    const session = await step("mobile", out, () =>
      withBrowser(({ page: mobilePage }) => checkMobile(mobilePage, page.public_id)),
    );
    out.mobile = session && session.value ? session.value : null;
  }

  return out;
}

async function main() {
  const mode = readMode();
  const phase = readPhase();
  const out = { stamp: STAMP, mode, phase, at: new Date().toISOString() };
  const before = {
    profile: await profileByPublicId(PROFILE_PUBLIC_ID),
    child: await pageByPublicId(EXISTING_CHILD_PUBLIC_ID),
  };
  out.before = {
    profile_revision: before.profile ? before.profile.published_revision : null,
    child_revision: before.child ? before.child.published_revision : null,
  };
  await runPhase(mode, phase, out);
  await runRegressions(before, out);
  return out;
}

main()
  .then((out) => {
    const text = JSON.stringify(out, null, 2);
    try {
      fs.writeFileSync(`scratch/qa-p7b-${out.mode}-${out.phase}.json`, text);
    } catch {}
    console.log(text);
  })
  .catch((error) => {
    const text = JSON.stringify({ fatal: String(error) }, null, 2);
    try {
      fs.writeFileSync("scratch/qa-p7b-failed.json", text);
    } catch {}
    console.log(text);
    process.exit(1);
  });
