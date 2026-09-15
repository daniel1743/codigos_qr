const fs = require('fs');
const env = {};
for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const base = env.VITE_SUPABASE_URL;
const sr = env.SUPABASE_SERVICE_ROLE_KEY;
const srH = { apikey: sr, Authorization: 'Bearer ' + sr, 'Content-Type': 'application/json' };

(async () => {
  // 1. Full page record for yfLEdka
  let r = await fetch(
    base + '/rest/v1/pages?select=*&public_id=eq.yfLEdka',
    { headers: srH },
  );
  console.log('=== pages where public_id=yfLEdka ===');
  console.log('HTTP', r.status);
  const rows = await r.json();
  console.log(JSON.stringify(rows, null, 2));

  // 2. Profile record (primary profile sY9wHGm) for regression baseline
  r = await fetch(
    base + '/rest/v1/profiles?select=id,user_id,public_id,slug,published,published_revision,published_template_config&public_id=eq.sY9wHGm',
    { headers: srH },
  );
  console.log('\n=== profiles where public_id=sY9wHGm (identity only) ===');
  console.log('HTTP', r.status);
  const prof = await r.json();
  if (Array.isArray(prof) && prof[0]) {
    const p = prof[0];
    console.log(JSON.stringify({
      id: p.id,
      user_id: p.user_id,
      public_id: p.public_id,
      slug: p.slug,
      published: p.published,
      published_revision: p.published_revision,
      published_template_config_keys: p.published_template_config ? Object.keys(p.published_template_config) : null,
    }, null, 2));
  } else {
    console.log(JSON.stringify(prof, null, 2));
  }
})();
