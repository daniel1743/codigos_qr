const fs = require('fs');
const env = {};
for (const l of fs.readFileSync('.env.local','utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g,'');
}
const base = env.VITE_SUPABASE_URL;
const sr = env.SUPABASE_SERVICE_ROLE_KEY;
const anon = env.VITE_SUPABASE_ANON_KEY;
const srH = { apikey: sr, Authorization: 'Bearer ' + sr, 'Content-Type': 'application/json' };
const anonH = { apikey: anon, Authorization: 'Bearer ' + anon, 'Content-Type': 'application/json' };
const OWNER = '8b1f25ff-ec0a-4cf2-93e2-f67c62a5a165';
const PROFILE = 'ff0cd302-07a4-4106-9a13-a14f9ded2f4b';
const ts = Date.now().toString();
const PUB = 'qarpcwrit' + ts;

(async () => {
  let r = await fetch(base + '/rest/v1/pages', { method: 'POST', headers: { ...srH, 'Prefer': 'return=representation' }, body: JSON.stringify({ owner_user_id: OWNER, profile_id: PROFILE, public_id: PUB, title: 'ORIGINAL', page_type: 'promotion', published: false }) });
  const created = await r.json();
  const id = created[0].id;
  console.log('created fixture id:', id, 'title=ORIGINAL');

  r = await fetch(base + '/rest/v1/pages?public_id=eq.'+PUB, { method: 'PATCH', headers: anonH, body: JSON.stringify({ title: 'HACKED' }) });
  console.log('anon PATCH status:', r.status);
  r = await fetch(base + '/rest/v1/pages?select=title&public_id=eq.'+PUB, { headers: srH });
  console.log('title after anon PATCH:', (await r.text()));

  r = await fetch(base + '/rest/v1/pages?public_id=eq.'+PUB, { method: 'DELETE', headers: anonH });
  console.log('anon DELETE status:', r.status);
  r = await fetch(base + '/rest/v1/pages?select=public_id&public_id=eq.'+PUB, { headers: srH });
  console.log('row after anon DELETE (should still exist):', (await r.text()));

  // cleanup
  r = await fetch(base + '/rest/v1/pages?public_id=eq.'+PUB, { method: 'DELETE', headers: srH });
  console.log('cleanup DELETE status:', r.status);

  // verify no lingering qarpc fixtures
  r = await fetch(base + '/rest/v1/pages?select=public_id&public_id=like.qarpc*', { headers: srH });
  console.log('lingering qarpc rows:', (await r.text()));
})();
