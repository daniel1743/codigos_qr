/** List / delete PAGES_7 QA leftovers. */
const fs = require("fs");

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
}

const base = env.VITE_SUPABASE_URL;
const headers = {
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

(async () => {
  const mode = process.argv[2] ?? "list";
  const rows = await (
    await fetch(
      base +
        "/rest/v1/pages?select=id,title,public_id,page_type,created_at&title=like.QA*&order=created_at.desc",
      { headers },
    )
  ).json();
  console.log(JSON.stringify(rows, null, 2));

  if (mode === "delete") {
    for (const row of rows) {
      const response = await fetch(base + "/rest/v1/pages?id=eq." + row.id, {
        method: "DELETE",
        headers,
      });
      console.log("deleted", row.id, response.status);
    }
    const rest = await (
      await fetch(base + "/rest/v1/pages?select=id&title=like.QA*", { headers })
    ).json();
    console.log("remaining", rest.length);
  }
})().catch((error) => {
  console.log(JSON.stringify({ fatal: String(error) }, null, 2));
  process.exit(1);
});
