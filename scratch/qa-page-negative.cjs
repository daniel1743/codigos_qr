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
const PUB_UNPUB = 'qarpcunpub' + ts;
const PUB_NULL = 'qarpcnullc' + ts;

async function rpc(pubid) {
  const r = await fetch(base + '/rest/v1/rpc/get_public_page_by_public_id', { method: 'POST', headers: anonH, body: JSON.stringify({ p_public_id: pubid }) });
  return { status: r.status, body: await r.text() };
}

(async () => {
  // 1. Create disposable fixtures via service role
  console.log('=== create disposable fixtures ===');
  let r = await fetch(base + '/rest/v1/pages', { method: 'POST', headers: { ...srH, 'Prefer': 'return=representation' }, body: JSON.stringify({
    owner_user_id: OWNER, profile_id: PROFILE, public_id: PUB_UNPUB, title: 'QA unpublished', page_type: 'promotion', published: false, published_template_config: {}
  })});
  console.log('insert unpublished:', r.status, (await r.text()).slice(0,160));

  r = await fetch(base + '/rest/v1/pages', { method: 'POST', headers: { ...srH, 'Prefer': 'return=representation' }, body: JSON.stringify({
    owner_user_id: OWNER, profile_id: PROFILE, public_id: PUB_NULL, title: 'QA null cfg', page_type: 'promotion', published: true, published_template_config: null
  })});
  console.log('insert null-config:', r.status, (await r.text()).slice(0,160));

  // 2. Negative tests via anon RPC
  console.log('=== negative tests (anon RPC) ===');
  let x = await rpc(PUB_UNPUB);
  console.log('unpublished -> rows:', JSON.parse(x.body).length, '(expect 0)');
  x = await rpc(PUB_NULL);
  console.log('null-config  -> rows:', JSON.parse(x.body).length, '(expect 0)');

  // 3. Anon write tests
  console.log('=== anon write tests (pages table) ===');
  r = await fetch(base + '/rest/v1/pages', { method: 'POST', headers: anonH, body: JSON.stringify({ owner_user_id: OWNER, profile_id: PROFILE, public_id: 'qarpcwrite'+ts, title: 'x', page_type: 'promotion', published: false }) });
  console.log('anon INSERT:', r.status, (await r.text()).slice(0,120));
  r = await fetch(base + '/rest/v1/pages?public_id=eq.'+PUB_UNPUB, { method: 'PATCH', headers: anonH, body: JSON.stringify({ title: 'hacked' }) });
  console.log('anon UPDATE:', r.status, (await r.text()).slice(0,120));
  r = await fetch(base + '/rest/v1/pages?public_id=eq.'+PUB_UNPUB, { method: 'DELETE', headers: anonH });
  console.log('anon DELETE:', r.status, (await r.text()).slice(0,120));

  // 4. Cleanup fixtures
  console.log('=== cleanup ===');
  r = await fetch(base + '/rest/v1/pages?public_id=in.('+PUB_UNPUB+','+PUB_NULL+')', { method: 'DELETE', headers: srH });
  console.log('delete fixtures:', r.status, (await r.text()).slice(0,120));
})();
