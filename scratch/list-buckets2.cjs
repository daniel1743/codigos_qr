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
  const r = await fetch(base + '/storage/v1/object/list/avatars?limit=100&offset=0&sortBy=%7B%22column%22%3A%22name%22%2C%22order%22%3A%22asc%22%7D', { headers: h });
  console.log('HTTP', r.status);
  console.log(await r.text());
})();
