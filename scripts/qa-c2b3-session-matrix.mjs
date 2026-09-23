/**
 * CRIPQER Analytics V1.1 — Phase C2B3 QA session matrix generator + verifier.
 *
 * Generates 8 DISTINCT, coherent QA sessions through the ONE canonical write
 * boundary (`public.track_analytics_event`) using the ANON key — exactly the
 * credential a public browser visitor uses — and then re-reads the persisted
 * rows with the SERVICE ROLE to cross-check DB truth against the session
 * dependent analytics contracts (continuity, action rate, funnel, channels,
 * top links, source/UTM).
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
  throw new Error(`Refusing to run: expected QA project tjigzcyoogmvdkivypym, got "${env.QA_PROJECT_REF}".`);
}

const PUBLIC_ID = "qa-c2b2-canonical-page";
const RUN = Date.now();
const PREFIX = `qa-c2b3-${RUN}`;

const anon = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const service = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** The 8-session matrix required by the C2B3 spec. */
const SESSION_MATRIX = [
  { id: "s1", name: "page_view only", source: null, utmSource: null, utmCampaign: null, actions: [] },
  { id: "s2", name: "page_view + cta_click", source: null, utmSource: null, utmCampaign: null, actions: ["cta_click"] },
  { id: "s3", name: "page_view + whatsapp_click", source: null, utmSource: null, utmCampaign: null, actions: ["whatsapp_click"] },
  { id: "s4", name: "page_view + instagram_click", source: null, utmSource: null, utmCampaign: null, actions: ["instagram_click"] },
  { id: "s5", name: "page_view + external_link_click (direct)", source: "direct", utmSource: null, utmCampaign: null, actions: ["external_link_click"] },
  { id: "s6", name: "page_view + cta_click + whatsapp_click", source: null, utmSource: null, utmCampaign: null, actions: ["cta_click", "whatsapp_click"] },
  { id: "s7", name: "page_view + multiple meaningful actions (utm)", source: null, utmSource: "qa_source", utmCampaign: "qa_campaign", actions: ["cta_click", "whatsapp_click", "instagram_click", "external_link_click"] },
  { id: "s8", name: "page_view only (no action)", source: null, utmSource: null, utmCampaign: null, actions: [] },
];

const ACTION_TARGET = {
  cta_click: { url: "https://example.com/qa-cta", itemId: "qa-hero", itemLabel: "Agendar consulta QA" },
  whatsapp_click: { url: "https://wa.me/56900000000", itemId: "qa-whatsapp", itemLabel: "WhatsApp QA" },
  instagram_click: { url: "https://instagram.com/cripqer.qa", itemId: "qa-instagram", itemLabel: "Instagram QA" },
  facebook_click: { url: "https://facebook.com/cripqer.qa", itemId: "qa-facebook", itemLabel: "Facebook QA" },
  tiktok_click: { url: "https://tiktok.com/@cripqer.qa", itemId: "qa-tiktok", itemLabel: "TikTok QA" },
  youtube_click: { url: "https://youtube.com/@cripqer.qa", itemId: "qa-youtube", itemLabel: "YouTube QA" },
  linkedin_click: { url: "https://linkedin.com/company/cripqer.qa", itemId: "qa-linkedin", itemLabel: "LinkedIn QA" },
  external_link_click: { url: "https://example.com/qa-external", itemId: "qa-external", itemLabel: "Sitio externo de ejemplo" },
};

const USER_AGENTS = {
  s1: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  s3: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
  s7: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/119 Safari/537.36",
};

const emit = async (args) => {
  const { data, error } = await anon.rpc("track_analytics_event", args);
  if (error) throw new Error(`track_analytics_event failed: ${error.message}`);
  return data;
};

async function main() {
  // 1) Resolve the canonical page through the PUBLIC read path (route loader parity).
  const { data: pageRows, error: pageErr } = await anon.rpc("get_public_page_by_public_id", {
    p_public_id: PUBLIC_ID,
  });
  if (pageErr) throw new Error(`public page lookup failed: ${pageErr.message}`);
  const page = pageRows?.[0];
  if (!page) throw new Error(`QA page "${PUBLIC_ID}" did not resolve publicly.`);
  const pageId = page.page_id;

  // 2) Emit the matrix (coherent session_id per session; session_start + page_view once each).
  const emitted = [];
  for (const session of SESSION_MATRIX) {
    const sessionId = `${PREFIX}-${session.id}`;
    const base = {
      p_public_id: PUBLIC_ID,
      p_session_id: sessionId,
      p_source: session.source,
      p_utm_source: session.utmSource,
      p_utm_campaign: session.utmCampaign,
      p_user_agent: USER_AGENTS[session.id] ?? null,
      p_referrer: null,
    };
    emitted.push({ session: session.name, sessionId, event: "session_start", id: await emit({ ...base, p_event_type: "session_start" }) });
    emitted.push({ session: session.name, sessionId, event: "page_view", id: await emit({ ...base, p_event_type: "page_view" }) });
    for (const action of session.actions) {
      const target = ACTION_TARGET[action];
      emitted.push({
        session: session.name,
        sessionId,
        event: action,
        id: await emit({
          ...base,
          p_event_type: action,
          p_target_url: target.url,
          p_item_id: target.itemId,
          p_item_label: target.itemLabel,
        }),
      });
    }
  }

  // 3) Security boundary checks (must be rejected / deduplicated).
  const security = {
    qr_scan_rejected: await emit({ p_public_id: PUBLIC_ID, p_event_type: "qr_scan", p_session_id: `${PREFIX}-sec` }),
    lead_created_rejected: await emit({ p_public_id: PUBLIC_ID, p_event_type: "lead_created", p_session_id: `${PREFIX}-sec` }),
    view_rejected: await emit({ p_public_id: PUBLIC_ID, p_event_type: "view", p_session_id: `${PREFIX}-sec` }),
    session_start_duplicate: await emit({ p_public_id: PUBLIC_ID, p_event_type: "session_start", p_session_id: `${PREFIX}-s1` }),
    unknown_page: await emit({ p_public_id: "does-not-exist-qa", p_event_type: "page_view", p_session_id: `${PREFIX}-sec` }),
  };

  // 4) Read back ONLY this run's rows (bounded, deterministic).
  const { data: rows, error: readErr } = await service
    .from("qr_analytics")
    .select("*")
    .eq("page_id", pageId)
    .like("session_id", `${PREFIX}-%`)
    .order("created_at", { ascending: true });
  if (readErr) throw new Error(`read back failed: ${readErr.message}`);

  // 5) Session continuity: every row of a session shares its session_id.
  const bySession = new Map();
  for (const row of rows) {
    const list = bySession.get(row.session_id) ?? [];
    list.push(row);
    bySession.set(row.session_id, list);
  }
  const continuity = [...bySession.entries()].map(([sessionId, list]) => {
    const eventTypes = list.map((r) => r.event_type);
    const coherent = list.every((r) => r.session_id === sessionId);
    const hasStart = eventTypes.includes("session_start");
    const hasView = eventTypes.includes("page_view");
    const startCount = eventTypes.filter((t) => t === "session_start").length;
    const viewCount = eventTypes.filter((t) => t === "page_view").length;
    return { sessionId, events: eventTypes.length, coherent, hasStart, hasView, startCount, viewCount };
  });

  // 6) Action rate (DB truth): sessions with >=1 meaningful action / sessions with page_view.
  const viewSessions = new Set();
  const actionSessions = new Set();
  const MEANINGFUL = ["cta_click", "whatsapp_click", "instagram_click", "facebook_click", "tiktok_click", "youtube_click", "linkedin_click", "external_link_click"];
  for (const row of rows) {
    if (row.event_type === "page_view") viewSessions.add(row.session_id);
    if (MEANINGFUL.includes(row.event_type)) actionSessions.add(row.session_id);
  }
  const actionRate = viewSessions.size > 0 ? actionSessions.size / viewSessions.size : 0;

  // 7) Funnel DB truth (the current engine anchors the funnel on qr_scan).
  const qrScanSessions = new Set();
  for (const row of rows) if (row.event_type === "qr_scan") qrScanSessions.add(row.session_id);

  // 8) Channel performance + top links (DB truth).
  const channelCounts = {};
  const linkCounts = {};
  for (const row of rows) {
    if (MEANINGFUL.includes(row.event_type)) {
      channelCounts[row.event_type] = (channelCounts[row.event_type] ?? 0) + 1;
      const key = row.item_id ?? row.event_type;
      linkCounts[key] = (linkCounts[key] ?? 0) + 1;
    }
  }

  // 9) Source/UTM preservation.
  const sourcePreservation = rows
    .filter((r) => r.event_type === "page_view" || r.event_type === "session_start")
    .map((r) => ({ session_id: r.session_id, source: r.source, utm_source: r.utm_source, utm_campaign: r.utm_campaign, user_agent: r.user_agent }));

  console.log(
    JSON.stringify(
      {
        projectRef: env.QA_PROJECT_REF,
        publicId: PUBLIC_ID,
        pageId,
        run: RUN,
        sessionsGenerated: bySession.size,
        totalEventsThisRun: rows.length,
        emitted,
        security,
        continuity,
        actionRate: { numerator: actionSessions.size, denominator: viewSessions.size, value: actionRate, percent: `${(actionRate * 100).toFixed(1)}%` },
        funnel: { qrScanSessions: qrScanSessions.size, note: "engine anchors funnel on qr_scan; with no qr_scan the Page/Interaction/Action stages are all zero" },
        channelCounts,
        linkCounts,
        sourcePreservation,
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

