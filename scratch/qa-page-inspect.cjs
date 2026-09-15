const fs = require('fs');
const env = {};
for (const l of fs.readFileSync('.env.local','utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g,'');
}
const base = env.VITE_SUPABASE_URL;
const sr = env.SUPABASE_SERVICE_ROLE_KEY;
const anon = env.VITE_SUPABASE_ANON_KEY;
(async () => {
  const srH = { apikey: sr, Authorization: 'Bearer ' + sr };
  const anonH = { apikey: anon, Authorization: 'Bearer ' + anon };

  console.log('=== SERVICE_ROLE: pages where public_id=yfLEdka (columns) ===');
  let r = await fetch(base + '/rest/v1/pages?select=id,owner_user_id,profile_id,public_id,title,page_type,template_config,published_template_config,published,published_revision,published_at,slug,created_at,updated_at&public_id=eq.yfLEdka', { headers: srH });
  console.log('HTTP', r.status);
  console.log(await r.text());

  console.log('=== ANON: direct SELECT on public.pages (should be denied/zero) ===');
  r = await fetch(base + '/rest/v1/pages?select=public_id,title&public_id=eq.yfLEdka', { headers: anonH });
  console.log('HTTP', r.status);
  console.log(await r.text());
})();
