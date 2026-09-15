/** Inspect the QA link-host page HTML for the internal /pg/ links. */
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
};

(async () => {
  const rows = await (
    await fetch(
      base + "/rest/v1/pages?select=id,public_id,title,published,template_config&title=like." +
        encodeURIComponent("QA PAGES_7B Link host*"),
      { headers },
    )
  ).json();
  const host = rows[0];
  const blockUrls = host.template_config.editorConfig.blocks
    .filter((block) => block.type === "cta")
    .map((block) => (block.content ? block.content.url : null));

  const response = await fetch("http://localhost:8080/pg/" + host.public_id);
  const html = await response.text();
  const hrefs = Array.from(html.matchAll(/href="([^"]*)"/g)).map((match) => match[1]);
  const anchors = Array.from(html.matchAll(/<a[^>]*>/g)).map((match) => match[0].slice(0, 200));

  console.log(
    JSON.stringify(
      {
        host: { public_id: host.public_id, published: host.published, title: host.title },
        block_urls: blockUrls,
        http: response.status,
        html_bytes: html.length,
        hrefs,
        anchor_tags: anchors.slice(0, 8),
        contains_pg: html.includes("/pg/"),
        pg_occurrences: (html.match(/\/pg\/[A-Za-z0-9]+/g) || []).slice(0, 6),
      },
      null,
      2,
    ),
  );
})().catch((error) => {
  console.log(JSON.stringify({ fatal: String(error) }, null, 2));
  process.exit(1);
});
