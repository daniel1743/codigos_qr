const fs = require('fs');
const env = {};
for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const base = env.VITE_SUPABASE_URL;
const anon = env.VITE_SUPABASE_ANON_KEY;
const sr = env.SUPABASE_SERVICE_ROLE_KEY;
const srH = { apikey: sr, Authorization: 'Bearer ' + sr, 'Content-Type': 'application/json' };
const anonH = { apikey: anon, Authorization: 'Bearer ' + anon, 'Content-Type': 'application/json' };

const PAGE_ID = '9a02efa0-f6de-4bf3-930f-edbed88c3e1e';
const PUBLIC_ID = 'yfLEdka';
const PROFILE_PUBLIC_ID = 'sY9wHGm';

(async () => {
  const out = {};

  // ---- PHASE 1: column existence + jsonb ----
  let r = await fetch(base + '/rest/v1/pages?select=id,public_id,qr_config&public_id=eq.' + PUBLIC_ID, { headers: srH });
  const pageRow = await r.json();
  out.column_exists = r.status === 200 && Array.isArray(pageRow) && pageRow.length > 0 && 'qr_config' in pageRow[0];
  out.select_qr_config_status = r.status;
  out.qr_config_value = pageRow[0] ? pageRow[0].qr_config : null;

  // jsonb "@>" contains operator (jsonb-only; would 400 on a plain json column)
  r = await fetch(base + '/rest/v1/pages?select=public_id&qr_config=cs.{}&public_id=eq.' + PUBLIC_ID, { headers: srH });
  out.jsonb_contains_ok = r.status === 200;
  out.jsonb_contains_status = r.status;

  // jsonb "->>" accessor (json/jsonb)
  r = await fetch(base + '/rest/v1/pages?select=public_id,qr_config->>qr_foreground_color&public_id=eq.' + PUBLIC_ID, { headers: srH });
  out.jsonb_arrow_ok = r.status === 200;
  out.jsonb_arrow_status = r.status;

  // ---- migration ledger attempt ----
  r = await fetch(base + '/rest/v1/supabase_migrations', { headers: srH });
  out.migration_ledger_rest = { status: r.status, body: (await r.text()).slice(0, 120) };

  // ---- RLS: anon direct select blocked ----
  r = await fetch(base + '/rest/v1/pages?select=public_id&public_id=eq.' + PUBLIC_ID, { headers: anonH });
  out.anon_select_status = r.status;
  out.anon_select_body = (await r.text()).slice(0, 120);

  // ---- RLS: anon direct update blocked ----
  r = await fetch(base + '/rest/v1/pages?public_id=eq.' + PUBLIC_ID, { method: 'PATCH', headers: anonH, body: JSON.stringify({ qr_config: { qr_foreground_color: '#000000' } }) });
  out.anon_update_status = r.status;
  out.anon_update_body = (await r.text()).slice(0, 120);

  // ---- PHASE 8: public RPC ----
  async function rpc(pubid) {
    const rr = await fetch(base + '/rest/v1/rpc/get_public_page_by_public_id', { method: 'POST', headers: anonH, body: JSON.stringify({ p_public_id: pubid }) });
    const body = await rr.text();
    let rows = null;
    try { rows = JSON.parse(body); } catch { rows = body; }
    return { status: rr.status, rows: Array.isArray(rows) ? rows.length : rows, keys: Array.isArray(rows) && rows[0] ? Object.keys(rows[0]).sort() : null };
  }
  out.public_rpc_child = await rpc(PUBLIC_ID);
  out.public_rpc_nonexistent = await rpc('qa-does-not-exist');

  // ---- current full state (service role) ----
  r = await fetch(base + '/rest/v1/pages?select=id,owner_user_id,profile_id,public_id,title,page_type,template_config,published_template_config,published,published_revision,published_at,slug,qr_config,created_at,updated_at&public_id=eq.' + PUBLIC_ID, { headers: srH });
  const full = (await r.json())[0];
  out.page_before = full ? {
    id: full.id,
    owner_user_id: full.owner_user_id,
    profile_id: full.profile_id,
    public_id: full.public_id,
    title: full.title,
    page_type: full.page_type,
    published: full.published,
    published_revision: full.published_revision,
    published_at: full.published_at,
    slug: full.slug,
    qr_config: full.qr_config,
    template_config_keys: full.template_config ? Object.keys(full.template_config) : null,
    published_template_config_keys: full.published_template_config ? Object.keys(full.published_template_config) : null,
  } : null;

  r = await fetch(base + '/rest/v1/profiles?select=id,user_id,public_id,published,published_revision,qr_foreground_color,qr_background_color,qr_dots_type,qr_logo_enabled,qr_gradient&public_id=eq.' + PROFILE_PUBLIC_ID, { headers: srH });
  out.profile_before = (await r.json())[0] || null;

  console.log(JSON.stringify(out, null, 2));
})();
