/**
 * CRIPQER Analytics V1.1 — Phase C2B4A QA device-context verification.
 *
 * Writes controlled sessions (desktop / mobile / tablet) through the ONE
 * canonical write boundary (`public.track_analytics_event`) using the ANON key
 * — exactly the credential a public browser visitor uses — then re-reads with
 * the SERVICE ROLE to cross-check DB truth against the session-level device
 * contract and the Top Links ranking.
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
const PREFIX = `qa-c2b4a-${RUN}`;

const anon = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const service = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Mirror of `classifyDeviceType` (browser helper) so the script can verify the
 *  writer's output deterministically without importing TypeScript. */
function classifyDeviceType(userAgent) {
  if (!userAgent) return "unknown";
  const ua = userAgent.toLowerCase();
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return "tablet";
  if (/mobile|android|ip(hone|od)|iemobile|blackberry|kindle|silk-accelerated|(hpw|web)os|opera m(obi|ini)/.test(ua)) {
    return "mobile";
  }
  return "desktop";
}

const UA = {
  desktop:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  mobile:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  tablet:
    "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
};

const SESSIONS = [
  { id: "d1", kind: "desktop", action: "cta_click", itemId: "qa-hero", itemLabel: "Agendar consulta QA" },
  { id: "d2", kind: "desktop", action: "cta_click", itemId: "qa-hero", itemLabel: "Agendar consulta QA" },
  { id: "m1", kind: "mobile", action: "whatsapp_click", itemId: "qa-whatsapp", itemLabel: "WhatsApp QA" },
  { id: "m2", kind: "mobile", action: "whatsapp_click", itemId: "qa-whatsapp", itemLabel: "WhatsApp QA" },
  { id: "t1", kind: "tablet", action: "instagram_click", itemId: "qa-instagram", itemLabel: "Instagram QA" },
];

async function rpcTrack(args) {
  const { error } = await anon.rpc("track_analytics_event", args);
  if (error) throw new Error(`rpc failed (${args.p_event_type}): ${error.message}`);
}

async function main() {
  // Resolve the QA page id (canonical public identity).
  const { data: pageRows, error: pageErr } = await service
    .from("pages")
    .select("id, public_id")
    .eq("public_id", PUBLIC_ID)
    .limit(1);
  if (pageErr) throw new Error(`page lookup failed: ${pageErr.message}`);
  const pageId = pageRows?.[0]?.id;
  if (!pageId) throw new Error(`page ${PUBLIC_ID} not found`);

  const emitted = [];
  for (const session of SESSIONS) {
    const sessionId = `${PREFIX}-${session.id}`;
    const userAgent = UA[session.kind];
    const deviceType = classifyDeviceType(userAgent);
    if (deviceType !== session.kind) {
      throw new Error(`classifier mismatch for ${session.kind}: got ${deviceType}`);
    }

    const base = { p_public_id: PUBLIC_ID, p_session_id: sessionId, p_user_agent: userAgent, p_device_type: deviceType };

    await rpcTrack({ ...base, p_event_type: "session_start" });
    emitted.push(`${session.id}:session_start`);
    await rpcTrack({ ...base, p_event_type: "page_view" });
    emitted.push(`${session.id}:page_view`);
    await rpcTrack({
      ...base,
      p_event_type: session.action,
      p_item_id: session.itemId,
      p_item_label: session.itemLabel,
      p_target_url: "https://example.com/qa-device",
    });
    emitted.push(`${session.id}:${session.action}`);
  }

  // Read back ONLY this run's rows.
  const { data: rows, error: readErr } = await service
    .from("qr_analytics")
    .select("*")
    .eq("page_id", pageId)
    .like("session_id", `${PREFIX}-%`)
    .order("created_at", { ascending: true });
  if (readErr) throw new Error(`read back failed: ${readErr.message}`);

  // Session continuity + device per session.
  const bySession = new Map();
  for (const row of rows) {
    const list = bySession.get(row.session_id) ?? [];
    list.push(row);
    bySession.set(row.session_id, list);
  }

  const deviceSessions = { desktop: 0, mobile: 0, tablet: 0 };
  const continuity = [];
  for (const [sessionId, list] of bySession.entries()) {
    const kinds = new Set(list.map((r) => r.device_type));
    const coherent = list.every((r) => r.session_id === sessionId) && kinds.size === 1;
    const kind = list[0]?.device_type;
    if (kind && deviceSessions[kind] !== undefined) deviceSessions[kind] += 1;
    const eventTypes = list.map((r) => r.event_type);
    continuity.push({
      sessionId,
      kind,
      events: eventTypes.length,
      coherent,
      hasStart: eventTypes.includes("session_start"),
      hasView: eventTypes.includes("page_view"),
      hasInteraction: eventTypes.some((t) => t !== "session_start" && t !== "page_view"),
      pageIds: [...new Set(list.map((r) => r.page_id))],
    });
  }

  // Top Links DB truth: rank click events by item_id.
  const CLICK_EVENTS = [
    "link_click", "external_link_click", "cta_click",
    "whatsapp_click", "instagram_click", "facebook_click",
    "tiktok_click", "youtube_click", "linkedin_click",
  ];
  const linkCounts = {};
  for (const row of rows) {
    if (!CLICK_EVENTS.includes(row.event_type)) continue;
    const key = row.item_id ?? row.event_type;
    linkCounts[key] = (linkCounts[key] ?? 0) + 1;
  }
  const linkRanking = Object.entries(linkCounts).sort((a, b) => b[1] - a[1]);

  console.log(
    JSON.stringify(
      {
        projectRef: env.QA_PROJECT_REF,
        publicId: PUBLIC_ID,
        pageId,
        run: RUN,
        emitted: emitted.length,
        totalEventsThisRun: rows.length,
        sessionsGenerated: bySession.size,
        deviceRowsPersisted: rows.filter((r) => r.device_type !== null).length,
        deviceSessions,
        continuity,
        linkRanking,
        verified: {
          everySessionHasDevice: rows.every((r) => r.device_type !== null),
          everyDeviceCoherentPerSession: continuity.every((c) => c.coherent),
          desktopSessions: deviceSessions.desktop >= 2,
          mobileSessions: deviceSessions.mobile >= 2,
          tabletContractSupported: deviceSessions.tablet === 1,
        },
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

