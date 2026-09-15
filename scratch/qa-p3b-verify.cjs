const fs = require('fs');
const env = {};
for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const base = env.VITE_SUPABASE_URL;
const sr = env.SUPABASE_SERVICE_ROLE_KEY;
const srH = { apikey: sr, Authorization: 'Bearer ' + sr, 'Content-Type': 'application/json' };

function checkConfig(label, envelope) {
  const ec = envelope && envelope.editorConfig;
  const result = {
    label,
    schemaVersion: envelope && envelope.schemaVersion,
    hasThemeColors: Boolean(ec && ec.theme && ec.theme.colors),
    hasThemeTypography: Boolean(ec && ec.theme && ec.theme.typography),
    hasLayoutResponsive: Boolean(ec && ec.layout && ec.layout.responsive),
    blocksIsArray: Array.isArray(ec && ec.blocks),
  };
  result.valid = result.hasThemeColors && result.hasThemeTypography && result.hasLayoutResponsive && result.blocksIsArray;
  console.log(JSON.stringify(result));
  return result.valid;
}

(async () => {
  const r = await fetch(base + '/rest/v1/pages?select=public_id,published,published_revision,template_config,published_template_config&public_id=eq.yfLEdka', { headers: srH });
  const rows = await r.json();
  const p = rows[0];
  console.log('public_id:', p.public_id, '| published:', p.published, '| published_revision:', p.published_revision);
  const draftOk = checkConfig('template_config', p.template_config);
  const pubOk = checkConfig('published_template_config', p.published_template_config);
  console.log('DRAFT_VALID:', draftOk, '| PUBLISHED_VALID:', pubOk);

  // Profile regression: confirm sY9wHGm unchanged
  const r2 = await fetch(base + '/rest/v1/profiles?select=id,public_id,published,published_revision&public_id=eq.sY9wHGm', { headers: srH });
  const pr = (await r2.json())[0];
  console.log('PROFILE sY9wHGm:', JSON.stringify({ id: pr.id, public_id: pr.public_id, published: pr.published, published_revision: pr.published_revision }));
})();
