const fs = require("fs");
const env = {};
for (const l of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const base = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;
const srKey = env.SUPABASE_SERVICE_ROLE_KEY;
const anonH = { apikey: anonKey, Authorization: "Bearer " + anonKey };

(async () => {
  console.log("=== ANON READ TESTS ===");
  // public bucket list (avatars) as anon
  let r = await fetch(base + "/storage/v1/object/list/avatars", { headers: anonH });
  console.log("anon list avatars      : HTTP", r.status, (await r.text()).slice(0, 80));
  r = await fetch(base + "/storage/v1/object/list/banners", { headers: anonH });
  console.log("anon list banners      : HTTP", r.status, (await r.text()).slice(0, 80));
  // private bucket list (encrypted-documents) as anon
  r = await fetch(base + "/storage/v1/object/list/encrypted-documents", { headers: anonH });
  console.log("anon list enc-docs     : HTTP", r.status, (await r.text()).slice(0, 120));

  console.log("=== ANON WRITE TEST (should DENY) ===");
  const body = new Blob(["qa"], { type: "text/plain" });
  r = await fetch(base + "/storage/v1/object/avatars/qa-anon-test.txt", {
    method: "POST",
    headers: { ...anonH, "Content-Type": "text/plain" },
    body,
  });
  console.log("anon upload to avatars : HTTP", r.status, (await r.text()).slice(0, 120));

  console.log("=== QA OWNER SIGN-IN ===");
  r = await fetch(base + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email: env.QA_EMAIL, password: env.QA_PASSWORD }),
  });
  const auth = await r.json();
  if (!auth.access_token) {
    console.log("SIGN-IN FAILED HTTP", r.status, JSON.stringify(auth).slice(0, 200));
    return;
  }
  console.log("QA sign-in OK, uid:", auth.user.id);
  const userH = { apikey: anonKey, Authorization: "Bearer " + auth.access_token };
  const uid = auth.user.id;

  console.log("=== OWNER WRITE TESTS ===");
  const qaPath = uid + "/qa-storage-bootstrap-test.txt";
  r = await fetch(base + "/storage/v1/object/avatars/" + qaPath, {
    method: "POST",
    headers: { ...userH, "Content-Type": "text/plain" },
    body,
  });
  console.log("owner upload own folder: HTTP", r.status, (await r.text()).slice(0, 120));

  // foreign folder mutation attempt (different uid) -> should DENY
  const foreignPath = "00000000-0000-0000-0000-000000000000/qa-foreign-test.txt";
  r = await fetch(base + "/storage/v1/object/avatars/" + foreignPath, {
    method: "POST",
    headers: { ...userH, "Content-Type": "text/plain" },
    body,
  });
  console.log("owner upload foreign   : HTTP", r.status, (await r.text()).slice(0, 120));

  // banners owner test
  r = await fetch(base + "/storage/v1/object/banners/" + qaPath, {
    method: "POST",
    headers: { ...userH, "Content-Type": "text/plain" },
    body,
  });
  console.log("owner upload banner    : HTTP", r.status, (await r.text()).slice(0, 120));

  // encrypted-documents owner test
  r = await fetch(base + "/storage/v1/object/encrypted-documents/" + qaPath, {
    method: "POST",
    headers: { ...userH, "Content-Type": "text/plain" },
    body,
  });
  console.log("owner upload enc-doc   : HTTP", r.status, (await r.text()).slice(0, 120));

  // cleanup own QA file
  console.log("=== CLEANUP ===");
  r = await fetch(base + "/storage/v1/object/avatars/" + qaPath, {
    method: "DELETE",
    headers: userH,
  });
  console.log("owner delete own file  : HTTP", r.status, (await r.text()).slice(0, 80));
  r = await fetch(base + "/storage/v1/object/banners/" + qaPath, {
    method: "DELETE",
    headers: userH,
  });
  console.log("owner delete banner    : HTTP", r.status, (await r.text()).slice(0, 80));
  r = await fetch(base + "/storage/v1/object/encrypted-documents/" + qaPath, {
    method: "DELETE",
    headers: userH,
  });
  console.log("owner delete enc-doc   : HTTP", r.status, (await r.text()).slice(0, 80));
})();
