/**
 * QA-only end-to-end verification of the canonical Analytics V1.1 write boundary.
 *
 * 1. Confirms the synthetic QA page resolves through the public RPC.
 * 2. Emits a full single-session funnel through `track_analytics_event` using the
 *    ANON key (exactly what a public browser visitor triggers).
 * 3. Re-reads the persisted rows with the service role and prints them.
 *
 * It never touches production and refuses unless QA_PROJECT_REF matches.
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
  throw new Error(`Refusing to verify: expected QA project, got "${env.QA_PROJECT_REF}".`);
}

const PUBLIC_ID = "qa-c2b2-canonical-page";
const SESSION_ID = `qa-session-${Date.now()}`;

const anon = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const service = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  // 1) Public page resolution (same path as the route loader).
  const { data: pageRows, error: pageErr } = await anon.rpc("get_public_page_by_public_id", {
    p_public_id: PUBLIC_ID,
  });
  if (pageErr) throw new Error(`public page lookup failed: ${pageErr.message}`);
  const page = pageRows?.[0];
  if (!page) throw new Error(`QA page "${PUBLIC_ID}" did not resolve publicly.`);
  const pageId = page.page_id;

  // 2) Clean slate for this page (synthetic QA rows only).
  await service.from("qr_analytics").delete().eq("page_id", pageId);

  // 3) Emit the funnel through the canonical boundary (anon, like the browser).
  const emit = async (args) => {
    const { data, error } = await anon.rpc("track_analytics_event", args);
    if (error) throw new Error(`track_analytics_event failed: ${error.message}`);
    return data;
  };

  const sessionStartId = await emit({ p_public_id: PUBLIC_ID, p_event_type: "session_start", p_session_id: SESSION_ID });
  const sessionStartDup = await emit({ p_public_id: PUBLIC_ID, p_event_type: "session_start", p_session_id: SESSION_ID });
  const pageViewId = await emit({ p_public_id: PUBLIC_ID, p_event_type: "page_view", p_session_id: SESSION_ID });
  const ctaId = await emit({
    p_public_id: PUBLIC_ID,
    p_event_type: "cta_click",
    p_session_id: SESSION_ID,
    p_target_url: "https://example.com/qa-cta",
    p_item_id: "qa-hero",
    p_item_label: "Agendar consulta QA",
  });
  const whatsappId = await emit({
    p_public_id: PUBLIC_ID,
    p_event_type: "whatsapp_click",
    p_session_id: SESSION_ID,
    p_target_url: "https://wa.me/56900000000",
    p_item_id: "qa-whatsapp",
    p_item_label: "WhatsApp QA",
  });
  const instagramId = await emit({
    p_public_id: PUBLIC_ID,
    p_event_type: "instagram_click",
    p_session_id: SESSION_ID,
    p_target_url: "https://instagram.com/cripqer.qa",
    p_item_id: "qa-instagram",
    p_item_label: "Instagram QA",
  });
  const externalId = await emit({
    p_public_id: PUBLIC_ID,
    p_event_type: "external_link_click",
    p_session_id: SESSION_ID,
    p_target_url: "https://example.com/qa-external",
    p_item_id: "qa-external",
    p_item_label: "Sitio externo de ejemplo",
  });
  const qrRejected = await emit({ p_public_id: PUBLIC_ID, p_event_type: "qr_scan", p_session_id: SESSION_ID });

  // 4) Read back persisted rows.
  const { data: rows, error: readErr } = await service
    .from("qr_analytics")
    .select("*")
    .eq("page_id", pageId)
    .order("created_at", { ascending: true });
  if (readErr) throw new Error(`read back failed: ${readErr.message}`);

  console.log(
    JSON.stringify(
      {
        pageId,
        sessionId: SESSION_ID,
        emitResults: {
          session_start: sessionStartId,
          session_start_duplicate: sessionStartDup,
          page_view: pageViewId,
          cta_click: ctaId,
          whatsapp_click: whatsappId,
          instagram_click: instagramId,
          external_link_click: externalId,
          qr_scan_rejected: qrRejected,
        },
        persistedRows: rows.map((row) => ({
          id: row.id,
          event_type: row.event_type,
          platform: row.platform,
          session_id: row.session_id,
          page_id: row.page_id,
          profile_id: row.profile_id,
          target_url: row.target_url,
          item_id: row.item_id,
          item_label: row.item_label,
          created_at: row.created_at,
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
