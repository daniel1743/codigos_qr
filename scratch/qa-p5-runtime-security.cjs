const fs = require("fs");
const env = {};
for (const l of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const base = env.VITE_SUPABASE_URL;
const anon = env.VITE_SUPABASE_ANON_KEY;
const sr = env.SUPABASE_SERVICE_ROLE_KEY;
const srH = { apikey: sr, Authorization: "Bearer " + sr, "Content-Type": "application/json" };
const anonH = { apikey: anon, Authorization: "Bearer " + anon, "Content-Type": "application/json" };

const PUBLIC_ID = "yfLEdka";
const OWNER_USER_ID = "8b1f25ff-ec0a-4cf2-93e2-f67c62a5a165";
const PROFILE_PUBLIC_ID = "sY9wHGm";

const CANONICAL_FIELDS = [
  "template_config",
  "published_template_config",
  "published",
  "published_revision",
  "public_id",
  "title",
  "page_type",
];
const PROFILE_QR_FIELDS = [
  "qr_foreground_color",
  "qr_background_color",
  "qr_dots_type",
  "qr_logo_enabled",
  "qr_gradient",
  "qr_logo_url",
];

async function getPage() {
  const r = await fetch(base + "/rest/v1/pages?select=*&public_id=eq." + PUBLIC_ID, {
    headers: srH,
  });
  return (await r.json())[0];
}
async function getProfile() {
  const r = await fetch(base + "/rest/v1/profiles?select=*&public_id=eq." + PROFILE_PUBLIC_ID, {
    headers: srH,
  });
  return (await r.json())[0];
}

(async () => {
  const out = {};

  // ---- 0. sign in as owner ----
  let r = await fetch(base + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email: env.QA_EMAIL, password: env.QA_PASSWORD }),
  });
  const auth = await r.json();
  out.owner_signin = {
    status: r.status,
    uid: auth.user && auth.user.id,
    has_token: Boolean(auth.access_token),
  };
  if (!auth.access_token) {
    console.log(JSON.stringify(out, null, 2));
    return;
  }
  const ownerUid = auth.user.id;
  const uH = {
    apikey: anon,
    Authorization: "Bearer " + auth.access_token,
    "Content-Type": "application/json",
  };
  out.owner_uid_matches_expected = ownerUid === OWNER_USER_ID;

  // ---- 1. capture BEFORE ----
  const pageBefore = await getPage();
  const profileBefore = await getProfile();
  out.before = {
    page: {
      qr_config: pageBefore.qr_config,
      published_revision: pageBefore.published_revision,
      published: pageBefore.published,
      public_id: pageBefore.public_id,
      title: pageBefore.title,
      page_type: pageBefore.page_type,
    },
    profile: {
      public_id: profileBefore.public_id,
      published_revision: profileBefore.published_revision,
    },
  };

  // ---- 2. owner saves QR config (harmless visual change) ----
  const SAVED_CONFIG = { qr_foreground_color: "#336699" };
  r = await fetch(base + "/rest/v1/pages?public_id=eq." + PUBLIC_ID, {
    method: "PATCH",
    headers: { ...uH, Prefer: "return=representation" },
    body: JSON.stringify({ qr_config: SAVED_CONFIG }),
  });
  out.owner_save = { status: r.status, body: (await r.text()).slice(0, 200) };

  // ---- 3. verify persistence (service role + owner select) ----
  const pageAfter = await getPage();
  out.persist_service_role = JSON.stringify(pageAfter.qr_config) === JSON.stringify(SAVED_CONFIG);

  r = await fetch(base + "/rest/v1/pages?select=qr_config&public_id=eq." + PUBLIC_ID, {
    headers: uH,
  });
  const ownerRead = await r.json();
  out.owner_select_qr = { status: r.status, qr_config: ownerRead[0] && ownerRead[0].qr_config };
  out.persist_owner_select =
    ownerRead[0] && JSON.stringify(ownerRead[0].qr_config) === JSON.stringify(SAVED_CONFIG);

  // ---- 4. canonical isolation ----
  out.canonical_isolation = {};
  for (const f of CANONICAL_FIELDS) {
    out.canonical_isolation[f] = {
      unchanged: JSON.stringify(pageBefore[f]) === JSON.stringify(pageAfter[f]),
    };
  }
  out.revision_before = pageBefore.published_revision;
  out.revision_after = pageAfter.published_revision;

  // ---- 5. profile QR isolation ----
  const profileAfter = await getProfile();
  out.profile_qr_isolation = { changed: false, diff: {} };
  for (const f of PROFILE_QR_FIELDS) {
    const same = JSON.stringify(profileBefore[f]) === JSON.stringify(profileAfter[f]);
    if (!same) {
      out.profile_qr_isolation.changed = true;
      out.profile_qr_isolation.diff[f] = { before: profileBefore[f], after: profileAfter[f] };
    }
  }
  out.profile_qr_isolation.public_id_unchanged = profileAfter.public_id === PROFILE_PUBLIC_ID;
  out.profile_qr_isolation.revision_unchanged = profileAfter.published_revision === 4;
  out.profile_qr_isolation.revision_value = profileAfter.published_revision;

  // ---- 6. security: anon update blocked ----
  r = await fetch(base + "/rest/v1/pages?public_id=eq." + PUBLIC_ID, {
    method: "PATCH",
    headers: anonH,
    body: JSON.stringify({ qr_config: { qr_foreground_color: "#ff0000" } }),
  });
  out.anon_update = { status: r.status, body: (await r.text()).slice(0, 120) };
  const pageAfterAnon = await getPage();
  out.anon_update_blocked =
    JSON.stringify(pageAfterAnon.qr_config) === JSON.stringify(SAVED_CONFIG);

  // ---- 7. security: foreign authenticated user blocked ----
  const foreignEmail = "qa-foreign-" + Date.now() + "@example.com";
  const foreignPassword = "QaForeign123!";
  let foreignId = null;
  let foreignResult = { note: "not run" };
  try {
    r = await fetch(base + "/auth/v1/admin/users", {
      method: "POST",
      headers: srH,
      body: JSON.stringify({ email: foreignEmail, password: foreignPassword, email_confirm: true }),
    });
    const created = await r.json();
    foreignId = created.id;
    out.foreign_create = {
      status: r.status,
      id: foreignId,
      error: created.error || created.msg || null,
    };

    if (foreignId) {
      r = await fetch(base + "/auth/v1/token?grant_type=password", {
        method: "POST",
        headers: { apikey: anon, "Content-Type": "application/json" },
        body: JSON.stringify({ email: foreignEmail, password: foreignPassword }),
      });
      const fauth = await r.json();
      out.foreign_signin = {
        status: r.status,
        uid: fauth.user && fauth.user.id,
        has_token: Boolean(fauth.access_token),
      };

      if (fauth.access_token) {
        const fH = {
          apikey: anon,
          Authorization: "Bearer " + fauth.access_token,
          "Content-Type": "application/json",
        };
        r = await fetch(base + "/rest/v1/pages?public_id=eq." + PUBLIC_ID, {
          method: "PATCH",
          headers: fH,
          body: JSON.stringify({ qr_config: { qr_foreground_color: "#00ff00" } }),
        });
        foreignResult = { status: r.status, body: (await r.text()).slice(0, 120) };
      }
    }
    const pageAfterForeign = await getPage();
    out.foreign_update = foreignResult;
    out.foreign_update_blocked =
      JSON.stringify(pageAfterForeign.qr_config) === JSON.stringify(SAVED_CONFIG);

    if (foreignId) {
      r = await fetch(base + "/auth/v1/admin/users/" + foreignId, {
        method: "DELETE",
        headers: srH,
      });
      out.foreign_cleanup = { status: r.status };
    }
  } catch (e) {
    out.foreign_error = String(e);
    if (foreignId) {
      await fetch(base + "/auth/v1/admin/users/" + foreignId, { method: "DELETE", headers: srH });
    }
  }

  // ---- 8. restore original qr_config (null) via owner ----
  r = await fetch(base + "/rest/v1/pages?public_id=eq." + PUBLIC_ID, {
    method: "PATCH",
    headers: { ...uH, Prefer: "return=representation" },
    body: JSON.stringify({ qr_config: null }),
  });
  out.restore = { status: r.status, body: (await r.text()).slice(0, 120) };
  const pageRestored = await getPage();
  out.restored_value = pageRestored.qr_config;
  out.restored_revision = pageRestored.published_revision;

  console.log(JSON.stringify(out, null, 2));
})();
