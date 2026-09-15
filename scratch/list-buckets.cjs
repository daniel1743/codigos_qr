const fs = require('fs');
const env = {};
for (const l of fs.readFileSync('.env.local','utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g,'');
}
const base = env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const h = { apikey: key, Authorization: 'Bearer ' + key };
(async () => {
  const r = await fetch(base + '/storage/v1/bucket', { headers: h });
  console.log('HTTP', r.status);
  const txt = await r.text();
  console.log(txt);
})();
