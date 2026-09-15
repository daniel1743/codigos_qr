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
