/**
 * PAGES_7B — remote `pages.page_type` contract verification.
 * Creates and deletes one clearly identifiable QA row per canonical type.
 */
const fs = require("fs");

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
}

const base = env.VITE_SUPABASE_URL;
const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;
const headers = {
  apikey: serviceRole,
  Authorization: `Bearer ${serviceRole}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

const TYPES = [
  "landing",
  "promotion",
  "menu",
  "campaign",
  "event",
  "services",
  "catalog",
  "portfolio",
];

async function qaIdentity() {
  const tokenResponse = await fetch(`${base}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: env.VITE_SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: env.QA_EMAIL, password: env.QA_PASSWORD }),
  });
  const session = await tokenResponse.json();
  if (!session?.user?.id) throw new Error(`QA sign-in failed: ${JSON.stringify(session)}`);
  const rows = await (
    await fetch(`${base}/rest/v1/profiles?select=id,user_id&user_id=eq.${session.user.id}`, {
      headers,
    })
  ).json();
  return { user: session.user, profile: rows[0] ?? null };
}

async function tryInsert(pageType, identity) {
  const response = await fetch(`${base}/rest/v1/pages`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      owner_user_id: identity.user.id,
      profile_id: identity.profile.id,
      page_type: pageType,
      title: `QA PAGES_7B contract ${pageType}`,
      template_config: null,
      published_template_config: null,
      published: false,
      published_revision: 0,
      slug: null,
    }),
  });
  const payload = await response.json().catch(() => null);
  return { status: response.status, payload };
}

(async () => {
  const identity = await qaIdentity();
  const out = { qa_user: identity.user.id, qa_profile_id: identity.profile?.id ?? null, types: {} };

  for (const pageType of TYPES) {
    const attempt = await tryInsert(pageType, identity);
    const accepted = attempt.status < 300;
    out.types[pageType] = {
      accepted,
      http: attempt.status,
      ...(accepted ? {} : { message: attempt.payload?.message }),
    };
    if (accepted) {
      const id = attempt.payload[0].id;
      const del = await fetch(`${base}/rest/v1/pages?id=eq.${id}`, { method: "DELETE", headers });
      out.types[pageType].cleaned_up = del.status < 300;
    }
  }

  const remaining = await (
    await fetch(`${base}/rest/v1/pages?select=id&title=like.QA*`, { headers })
  ).json();
  out.qa_rows_left = Array.isArray(remaining) ? remaining.length : null;
  out.all_new_types_accepted =
    out.types.services.accepted && out.types.catalog.accepted && out.types.portfolio.accepted;
  out.all_legacy_types_accepted =
    out.types.landing.accepted &&
    out.types.promotion.accepted &&
    out.types.menu.accepted &&
    out.types.campaign.accepted &&
    out.types.event.accepted;

  console.log(JSON.stringify(out, null, 2));
})().catch((error) => {
  console.log(JSON.stringify({ fatal: String(error) }, null, 2));
  process.exit(1);
});
