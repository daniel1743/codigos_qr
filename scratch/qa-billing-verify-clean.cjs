const fs = require("fs");
const env = {};
for (const l of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const h = {
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY,
};
(async () => {
  const res = await fetch(
    env.VITE_SUPABASE_URL +
      "/rest/v1/billing_events?select=id,provider,event_id,status&event_id=like.qa-restore-*",
    { headers: h },
  );
  console.log("lingering qa rows:", await res.text());
})();
