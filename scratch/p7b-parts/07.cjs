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
