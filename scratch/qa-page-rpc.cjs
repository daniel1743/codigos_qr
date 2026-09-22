const fs = require("fs");
const env = {};
for (const l of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const base = env.VITE_SUPABASE_URL;
const sr = env.SUPABASE_SERVICE_ROLE_KEY;
const anon = env.VITE_SUPABASE_ANON_KEY;
const anonH = { apikey: anon, Authorization: "Bearer " + anon, "Content-Type": "application/json" };
const srH = { apikey: sr, Authorization: "Bearer " + sr, "Content-Type": "application/json" };

async function rpc(pubid) {
  const r = await fetch(base + "/rest/v1/rpc/get_public_page_by_public_id", {
    method: "POST",
    headers: anonH,
    body: JSON.stringify({ p_public_id: pubid }),
  });
  return { status: r.status, body: await r.text() };
}

(async () => {
  console.log("=== ANON RPC: published page yfLEdka ===");
  let x = await rpc("yfLEdka");
  console.log("HTTP", x.status);
  console.log(x.body);
  const rows = JSON.parse(x.body);
  const keys = rows.length ? Object.keys(rows[0]).sort() : [];
  console.log("row_count:", rows.length);
  console.log("response_keys:", keys.join(","));

  console.log("=== ANON RPC: nonexistent ===");
  x = await rpc("qa-does-not-exist");
  console.log("HTTP", x.status, "body:", x.body);

  console.log("=== SERVICE_ROLE: find unpublished / null-config fixtures ===");
  let r = await fetch(
    base +
      "/rest/v1/pages?select=public_id,title,published,published_template_config&or=(published.eq.false,published_template_config.is.null)&limit=5",
    { headers: srH },
  );
  console.log("HTTP", r.status, (await r.text()).slice(0, 800));

  console.log("=== ANON: direct table SELECT still blocked? ===");
  r = await fetch(base + "/rest/v1/pages?select=public_id&limit=5", {
    headers: { apikey: anon, Authorization: "Bearer " + anon },
  });
  console.log("HTTP", r.status, "body:", (await r.text()).slice(0, 120));
})();
