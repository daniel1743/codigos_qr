const fs = require("fs");
const env = {};
for (const l of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const base = env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const h = { apikey: key, Authorization: "Bearer " + key };
(async () => {
  for (const b of ["avatars", "banners", "encrypted-documents"]) {
    const r = await fetch(base + "/storage/v1/object/list/" + b, { headers: h });
    const txt = await r.text();
    console.log("=== " + b + " (service_role list) ===");
    console.log("HTTP", r.status);
    try {
      const j = JSON.parse(txt);
      const qa = (Array.isArray(j) ? j : []).filter((o) => (o.name || "").includes("qa-"));
      console.log(
        "total objects:",
        Array.isArray(j) ? j.length : "n/a",
        "| qa- matches:",
        qa.length,
      );
    } catch (e) {
      console.log(txt.slice(0, 200));
    }
  }
})();
