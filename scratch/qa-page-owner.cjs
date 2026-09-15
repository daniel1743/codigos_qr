const fs = require('fs');
const env = {};
for (const l of fs.readFileSync('.env.local','utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g,'');
}
const base = env.VITE_SUPABASE_URL;
const anon = env.VITE_SUPABASE_ANON_KEY;
const sr = env.SUPABASE_SERVICE_ROLE_KEY;
const srH = { apikey: sr, Authorization: 'Bearer ' + sr, 'Content-Type': 'application/json' };

(async () => {
  // sign in as QA owner
  let r = await fetch(base + '/auth/v1/token?grant_type=password', {
    method: 'POST', headers: { apikey: anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: env.QA_EMAIL, password: env.QA_PASSWORD })
  });
  const auth = await r.json();
  if (!auth.access_token) { console.log('SIGNIN FAIL', r.status, JSON.stringify(auth).slice(0,200)); return; }
  const uid = auth.user.id;
  const uH = { apikey: anon, Authorization: 'Bearer ' + auth.access_token, 'Content-Type': 'application/json' };
  console.log('owner sign-in OK uid:', uid);

  // 1. owner list own pages (owner_select_page)
  r = await fetch(base + '/rest/v1/pages?select=public_id,title,published&limit=50', { headers: uH });
  const list = await r.json();
  console.log('owner list pages HTTP', r.status, '| count:', Array.isArray(list)?list.length:'ERR');
  console.log('  contains yfLEdka:', Array.isArray(list) && list.some(p => p.public_id === 'yfLEdka'));

  // 2. owner read own page yfLEdka
  r = await fetch(base + '/rest/v1/pages?select=public_id,title,published&public_id=eq.yfLEdka', { headers: uH });
  console.log('owner read yfLEdka:', r.status, (await r.text()).slice(0,160));

  // 3. saveDraft (owner_insert_page) on a disposable page
  const ts = Date.now().toString();
  const PUB = 'qarpcownr' + ts;
  const profile = 'ff0cd302-07a4-4106-9a13-a14f9ded2f4b';
  r = await fetch(base + '/rest/v1/pages', { method: 'POST', headers: { ...uH, 'Prefer': 'return=representation' }, body: JSON.stringify({ owner_user_id: uid, profile_id: profile, public_id: PUB, title: 'QA owner draft', page_type: 'promotion', published: false }) });
  const created = await r.json();
  console.log('owner create draft:', r.status, '| id:', created[0] && created[0].id);

  // 4. publish (owner_update_page) on the disposable page
  r = await fetch(base + '/rest/v1/pages?public_id=eq.'+PUB, { method: 'PATCH', headers: uH, body: JSON.stringify({ published: true, published_template_config: { qa: true } }) });
  console.log('owner publish draft:', r.status);
  r = await fetch(base + '/rest/v1/pages?select=public_id,published&public_id=eq.'+PUB, { headers: uH });
  console.log('  after publish:', (await r.text()));

  // 5. cleanup disposable page (owner_delete_page)
  r = await fetch(base + '/rest/v1/pages?public_id=eq.'+PUB, { method: 'DELETE', headers: uH });
  console.log('owner delete disposable:', r.status);

  // 6. verify yfLEdka unchanged (service role)
  r = await fetch(base + '/rest/v1/pages?select=public_id,title,published,published_revision&public_id=eq.yfLEdka', { headers: srH });
  console.log('yfLEdka final state:', (await r.text()));

  // verify no lingering qarpcownr rows
  r = await fetch(base + '/rest/v1/pages?select=public_id&public_id=like.qarpcownr*', { headers: srH });
  console.log('lingering qarpcownr:', (await r.text()));
})();
