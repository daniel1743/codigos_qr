const fs = require('fs');
const env = {};
for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const h = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY, 'Content-Type': 'application/json', Prefer: 'return=representation' };
fetch(env.VITE_SUPABASE_URL + '/rest/v1/pages?public_id=eq.yfLEdka', { method: 'PATCH', headers: h, body: JSON.stringify({ slug: null }) })
  .then(async (r) => console.log('status', r.status, 'slug reset'));
