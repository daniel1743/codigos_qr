/**
 * CRIPQER Analytics V1.1 — Phase C2B5 QA security-boundary verification.
 *
 * Verifies, against cripqer-qa, that the canonical write boundary is the ONLY
 * way analytics rows enter qr_analytics and that read protection holds:
 *
 *   1. direct raw INSERT (anon) is DENIED (legacy "Anyone can insert" dropped)
 *   2. anon SELECT on qr_analytics returns 0 rows (RLS read denial)
 *   3. service_role SELECT still sees rows (sanity — owner bypass unaffected)
 *   4. track_analytics_event accepts a valid published page + allowlisted event
 *   5. fake public_id -> rejected (NULL, no write)
 *   6. invalid event_type (legacy + future) -> rejected (NULL)
 *   7. invalid device_type -> stored as NULL (server-side backstop)
 *   8. oversized metadata -> bounded (left() truncation) on readback
 *   9. qr_scan source is forced to 'qr' (never trusted from the browser)
 *  10. aggregate views (qr_analytics_daily / qr_top_links) honor RLS for anon
 *  11. legacy write RPC track_page_view still works (compatibility, hardened)
 *
 * It NEVER touches production and refuses unless QA_PROJECT_REF matches.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const raw = readFileSync(new URL("../.env.qa", import.meta.url), "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = loadEnv();
if (env.QA_PROJECT_REF !== "tjigzcyoogmvdkivypym") {
  throw new Error(
    `Refusing to run: expected QA project tjigzcyoogmvdkivypym, got "${env.QA_PROJECT_REF}".`,
  );
}

const PUBLIC_ID = "qa-c2b2-canonical-page";
const RUN = Date.now();
const PREFIX = `qa-c2b5-${RUN}`;

const anon = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const service = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const results = {};

  // Resolve the synthetic QA page through the public RPC (same as the route loader).
  const { data: pageRows, error: pageErr } = await anon.rpc("get_public_page_by_public_id", {
    p_public_id: PUBLIC_ID,
  });
  if (pageErr) throw new Error(`public page lookup failed: ${pageErr.message}`);
  const page = pageRows?.[0];
  if (!page) throw new Error(`QA page "${PUBLIC_ID}" did not resolve publicly.`);
  const pageId = page.page_id;

  // ---- 1) Direct raw INSERT must be denied for anon (RLS). ----
  const directInsert = await anon.from("qr_analytics").insert({
    profile_id: "00000000-0000-0000-0000-000000000000",
    event_type: "page_view",
    session_id: `${PREFIX}-direct-insert`,
  });
  results.directInsertDenied = Boolean(directInsert.error);

  // ---- 2) anon SELECT must return 0 rows (no matching RLS policy). ----
  const { data: anonRows, error: anonReadErr } = await anon
    .from("qr_analytics")
    .select("id")
    .limit(1);
  results.anonReadError = anonReadErr ? anonReadErr.message : null;
  results.anonReadRowCount = (anonRows ?? []).length;

  // ---- 3) service_role SELECT must still see rows (sanity). ----
  const { data: svcRows } = await service
    .from("qr_analytics")
    .select("id")
    .eq("page_id", pageId)
    .limit(1);
  results.serviceRoleReadVisible = (svcRows ?? []).length >= 1;

  // ---- 4) valid page + allowlisted event through the canonical RPC. ----
  const sessionId = `${PREFIX}-valid`;
  const validWrite = await anon.rpc("track_analytics_event", {
    p_public_id: PUBLIC_ID,
    p_event_type: "page_view",
    p_session_id: sessionId,
  });
  results.validWriteAccepted = Boolean(validWrite.data) && !validWrite.error;

  // ---- 5) fake public_id -> rejected. ----
  const fakePublic = await anon.rpc("track_analytics_event", {
    p_public_id: "c2b5-does-not-exist",
    p_event_type: "page_view",
    p_session_id: `${PREFIX}-fake`,
  });
  results.fakePublicRejected = !fakePublic.data && !fakePublic.error;

  // ---- 6) invalid event types -> rejected. ----
  const invalidTypes = [
    "lead_created",
    "share",
    "return_visit",
    "view",
    "link_click",
    "not_an_event",
  ];
  const invalidTypeResults = {};
  for (const t of invalidTypes) {
    const { data } = await anon.rpc("track_analytics_event", {
      p_public_id: PUBLIC_ID,
      p_event_type: t,
      p_session_id: `${PREFIX}-badtype-${t}`,
    });
    invalidTypeResults[t] = data === null;
  }
  results.invalidEventTypesRejected = invalidTypeResults;

  // ---- 7) invalid device_type -> stored as NULL (server-side backstop). ----
  const badDeviceSession = `${PREFIX}-baddevice`;
  await anon.rpc("track_analytics_event", {
    p_public_id: PUBLIC_ID,
    p_event_type: "page_view",
    p_session_id: badDeviceSession,
    p_device_type: "smartphone",
  });
  const { data: badDeviceRows } = await service
    .from("qr_analytics")
    .select("device_type")
    .eq("session_id", badDeviceSession)
    .limit(1);
  results.invalidDeviceTypeStoredAsNull = badDeviceRows?.[0]?.device_type === null;

  // ---- 8) oversized metadata -> bounded via left() on readback. ----
  const oversizedSession = `${PREFIX}-oversized`;
  await anon.rpc("track_analytics_event", {
    p_public_id: PUBLIC_ID,
    p_event_type: "cta_click",
    p_session_id: oversizedSession,
    p_target_url: `https://example.com/${"x".repeat(4000)}`,
    p_item_id: "y".repeat(1000),
    p_item_label: "z".repeat(2000),
    p_source: "s".repeat(500),
  });
  const { data: oversizedRows } = await service
    .from("qr_analytics")
    .select("target_url, item_id, item_label, source")
    .eq("session_id", oversizedSession)
    .limit(1);
  const row = oversizedRows?.[0];
  results.metadataBounded =
    row &&
    row.target_url.length === 2048 &&
    row.item_id.length === 256 &&
    row.item_label.length === 512 &&
    row.source.length === 128;

  // ---- 9) qr_scan source forced to 'qr' even when the browser lies. ----
  const qrSession = `${PREFIX}-qrsource`;
  await anon.rpc("track_analytics_event", {
    p_public_id: PUBLIC_ID,
    p_event_type: "qr_scan",
    p_session_id: qrSession,
    p_qr_id: PUBLIC_ID,
    p_source: "direct", // lie — must be overridden to 'qr'
  });
  const { data: qrRows } = await service
    .from("qr_analytics")
    .select("source, qr_id")
    .eq("session_id", qrSession)
    .limit(1);
  results.qrScanSourceForcedToQr = qrRows?.[0]?.source === "qr";

  // ---- 10) aggregate views must honor RLS (no cross-tenant/anonymous read). ----
  const { data: anonDaily, error: anonDailyErr } = await anon
    .from("qr_analytics_daily")
    .select("profile_id")
    .limit(1);
  results.anonDailyReadDenied = Boolean(anonDailyErr) || (anonDaily ?? []).length === 0;

  const { data: anonTopLinks, error: anonTopLinksErr } = await anon
    .from("qr_top_links")
    .select("profile_id")
    .limit(1);
  results.anonTopLinksReadDenied = Boolean(anonTopLinksErr) || (anonTopLinks ?? []).length === 0;

  // ---- 11) legacy write RPC compatibility: track_page_view still works. ----
  const { data: pageProfileRows } = await service
    .from("pages")
    .select("profile_id")
    .eq("id", pageId)
    .limit(1);
  const pageProfileId = pageProfileRows?.[0]?.profile_id;
  const legacyViewSession = `${PREFIX}-legacy-view`;
  const legacyView = pageProfileId
    ? await anon.rpc("track_page_view", {
        p_profile_id: pageProfileId,
        p_session_id: legacyViewSession,
        p_device_type: "unknown",
      })
    : { data: null, error: { message: "no profile resolved" } };
  results.legacyTrackPageViewAccepted = Boolean(legacyView.data) && !legacyView.error;

  // ---- Cleanup: remove only this run's synthetic rows. ----
  const { error: cleanupErr } = await service
    .from("qr_analytics")
    .delete()
    .like("session_id", `${PREFIX}-%`);
  results.cleanupError = cleanupErr ? cleanupErr.message : null;

  const pass =
    results.directInsertDenied &&
    results.anonReadRowCount === 0 &&
    results.serviceRoleReadVisible &&
    results.validWriteAccepted &&
    results.fakePublicRejected &&
    Object.values(results.invalidEventTypesRejected).every(Boolean) &&
    results.invalidDeviceTypeStoredAsNull &&
    results.metadataBounded &&
    results.qrScanSourceForcedToQr &&
    results.anonDailyReadDenied &&
    results.anonTopLinksReadDenied &&
    results.legacyTrackPageViewAccepted;

  results.verdict = pass ? "C2B5_SECURITY_BOUNDARY_PASS" : "C2B5_SECURITY_BOUNDARY_FAIL";

  console.log(
    JSON.stringify({ projectRef: env.QA_PROJECT_REF, pageId, run: RUN, ...results }, null, 2),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
