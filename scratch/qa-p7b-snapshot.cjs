/**
 * PAGES_7B — remote data snapshot (before/after the PageType migration).
 * Read-only. Writes JSON to the path given as argv[2].
 */
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

const digest = (value) => {
  const text = JSON.stringify(value ?? null);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${text.length}:${(hash >>> 0).toString(16)}`;
};

(async () => {
  const target = process.argv[2] ?? "scratch/p7b-before.json";

  const pages = await (
    await fetch(
      base +
        "/rest/v1/pages?select=id,owner_user_id,profile_id,public_id,title,page_type,published,published_revision,slug,qr_config,template_config,published_template_config&order=created_at.asc",
      { headers },
    )
  ).json();

  const profiles = await (
    await fetch(
      base +
        "/rest/v1/profiles?select=id,user_id,public_id,slug,published_revision,template_config&public_id=eq.sY9wHGm",
      { headers },
    )
  ).json();

  const snapshot = {
    captured_at: new Date().toISOString(),
    pages: (Array.isArray(pages) ? pages : []).map((row) => ({
      id: row.id,
      public_id: row.public_id,
      title: row.title,
      page_type: row.page_type,
      published: row.published,
      published_revision: row.published_revision,
      slug: row.slug,
      qr_config: row.qr_config ?? null,
      template_config_digest: digest(row.template_config),
      published_template_config_digest: digest(row.published_template_config),
    })),
    protected_profile: (profiles[0] ?? null) && {
      public_id: profiles[0].public_id,
      slug: profiles[0].slug,
      published_revision: profiles[0].published_revision,
      template_config_digest: digest(profiles[0].template_config),
    },
  };

  fs.writeFileSync(target, JSON.stringify(snapshot, null, 2));
  console.log(
    JSON.stringify(
      {
        target,
        pages: snapshot.pages.length,
        page_types: [...new Set(snapshot.pages.map((row) => row.page_type))],
        protected_profile: snapshot.protected_profile,
      },
      null,
      2,
    ),
  );
})().catch((error) => {
  console.log(JSON.stringify({ fatal: String(error) }, null, 2));
  process.exit(1);
});
