/**
 * CRIPQER Analytics V1.1 — Phase C2B4B QA QR-scan boundary verification.
 *
 * Writes controlled QR journeys + direct visits through the ONE canonical write
 * boundary (`public.track_analytics_event`) using the ANON key, then re-reads
 * with the SERVICE ROLE to cross-check DB truth:
 *   - a QR journey persists a `qr_scan` with qr_id + source='qr'
 *   - a direct `/pg` (or `/pg/a` slug) visit never creates a `qr_scan`
 *   - distinct legitimate QR scans are counted separately
 *   - session continuity: scan + page_view + interaction share one session_id
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
const PREFIX = `qa-c2b4b-${RUN}`;

const anon = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const service = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function rpcTrack(args) {
  const { error } = await anon.rpc("track_analytics_event", args);
  if (error) throw new Error(`rpc failed (${args.p_event_type}): ${error.message}`);
}

/** The journeys mirror the real /q/{publicId} -> /pg/{publicId} flow. */
async function main() {
  const { data: pageRows, error: pageErr } = await service
    .from("pages")
    .select("id, public_id")
    .eq("public_id", PUBLIC_ID)
    .limit(1);
  if (pageErr) throw new Error(`page lookup failed: ${pageErr.message}`);
  const pageId = pageRows?.[0]?.id;
  if (!pageId) throw new Error(`page ${PUBLIC_ID} not found`);

  const emitted = [];

  // case 1: real QR path -> page -> CTA (full journey)
  const qr1 = `${PREFIX}-qr1`;
  await rpcTrack({ p_public_id: PUBLIC_ID, p_event_type: "qr_scan", p_session_id: qr1, p_qr_id: PUBLIC_ID });
  emitted.push("qr1:qr_scan");
  await rpcTrack({ p_public_id: PUBLIC_ID, p_event_type: "session_start", p_session_id: qr1 });
  emitted.push("qr1:session_start");
  await rpcTrack({ p_public_id: PUBLIC_ID, p_event_type: "page_view", p_session_id: qr1 });
  emitted.push("qr1:page_view");
  await rpcTrack({ p_public_id: PUBLIC_ID, p_event_type: "cta_click", p_session_id: qr1, p_item_id: "qa-hero", p_item_label: "Agendar consulta QA", p_target_url: "https://example.com/qa-cta" });
  emitted.push("qr1:cta_click");

  // case 2: real QR path -> page -> no action
  const qr2 = `${PREFIX}-qr2`;
  await rpcTrack({ p_public_id: PUBLIC_ID, p_event_type: "qr_scan", p_session_id: qr2, p_qr_id: PUBLIC_ID });
  emitted.push("qr2:qr_scan");
  await rpcTrack({ p_public_id: PUBLIC_ID, p_event_type: "session_start", p_session_id: qr2 });
  emitted.push("qr2:session_start");
  await rpcTrack({ p_public_id: PUBLIC_ID, p_event_type: "page_view", p_session_id: qr2 });
  emitted.push("qr2:page_view");

  // case 3: direct /pg/{public_id} (NO qr_scan)
  const d1 = `${PREFIX}-direct1`;
  await rpcTrack({ p_public_id: PUBLIC_ID, p_event_type: "session_start", p_session_id: d1 });
  await rpcTrack({ p_public_id: PUBLIC_ID, p_event_type: "page_view", p_session_id: d1 });

  // case 4: direct /pg/a/{slug} (same page; NO qr_scan)
  const d2 = `${PREFIX}-direct2`;
  await rpcTrack({ p_public_id: PUBLIC_ID, p_event_type: "session_start", p_session_id: d2 });
  await rpcTrack({ p_public_id: PUBLIC_ID, p_event_type: "page_view", p_session_id: d2 });

  // case 5: repeat legitimate QR journey (distinct session, second scan allowed)
  const qr3 = `${PREFIX}-qr3`;
  await rpcTrack({ p_public_id: PUBLIC_ID, p_event_type: "qr_scan", p_session_id: qr3, p_qr_id: PUBLIC_ID });
  await rpcTrack({ p_public_id: PUBLIC_ID, p_event_type: "session_start", p_session_id: qr3 });
  await rpcTrack({ p_public_id: PUBLIC_ID, p_event_type: "page_view", p_session_id: qr3 });

  // Read back ONLY this run's rows.
  const { data: rows, error: readErr } = await service
    .from("qr_analytics")
    .select("*")
    .eq("page_id", pageId)
    .like("session_id", `${PREFIX}-%`)
    .order("created_at", { ascending: true });
  if (readErr) throw new Error(`read back failed: ${readErr.message}`);

    const scanRows = rows.filter((r) => r.event_type === "qr_scan");
  const scanSessions = new Set(scanRows.map((r) => r.session_id));
  const viewRows = rows.filter((r) => r.event_type === "page_view");
  const interactionRows = rows.filter((r) =>
    ["cta_click", "whatsapp_click", "instagram_click", "external_link_click"].includes(r.event_type),
  );

  // Direct visits must have zero qr_scan.
  const directSessions = [d1, d2];
  const directHasScan = directSessions.some((sid) => scanSessions.has(sid));

  // QR journeys must share one session between scan and page_view.
  const qrJourneySessions = [qr1, qr2, qr3];
  const continuity = qrJourneySessions.map((sid) => {
    const events = rows.filter((r) => r.session_id === sid).map((r) => r.event_type);
    return { sessionId: sid, events, hasScan: events.includes("qr_scan"), hasView: events.includes("page_view") };
  });

  console.log(
    JSON.stringify(
      {
        projectRef: env.QA_PROJECT_REF,
        publicId: PUBLIC_ID,
        pageId,
        run: RUN,
        emitted: emitted.length,
        totalEventsThisRun: rows.length,
        scanCount: scanRows.length,
        distinctScanSessions: scanSessions.size,
        pageViews: viewRows.length,
        interactions: interactionRows.length,
        scanRows: scanRows.map((r) => ({ session_id: r.session_id, qr_id: r.qr_id, source: r.source, event_type: r.event_type })),
        directHasScan,
        continuity,
        verified: {
          everyScanHasQrId: scanRows.every((r) => r.qr_id === PUBLIC_ID),
          everyScanSourceIsQr: scanRows.every((r) => r.source === "qr"),
          directVisitCreatesNoScan: !directHasScan,
          fullJourney: continuity.find((c) => c.sessionId === qr1)?.events.length === 4,
          repeatScanAllowed: scanSessions.size === 3,
          pageViewFollowsScan: continuity.every((c) => c.hasScan && c.hasView),
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

