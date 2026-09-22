import { generateSmartGoals } from "./goals-engine";
import { computeMetrics, resolveRange } from "./metrics-engine";
import { toAnalyticsEventV1 } from "./cripqer-event-adapter";
import { resolveWidgets } from "./widget-registry";
import type { AnalyticsEventV1 } from "./analytics.types";

const timezone = "America/Santiago";
const now = new Date("2026-09-22T15:00:00.000Z");
const event = (id: string, type: AnalyticsEventV1["eventType"], timestamp: string, sessionId?: string, extra: Partial<AnalyticsEventV1> = {}): AnalyticsEventV1 => ({
  id,
  eventType: type,
  timestamp,
  profileId: "profile-1",
  ...(sessionId ? { sessionId } : {}),
  ...extra,
});

const events: AnalyticsEventV1[] = [
  event("a-qr", "qr_scan", "2026-09-22T14:00:00Z", "A", { qrId: "qr-1", device: "mobile", country: "Chile", source: "qr" }),
  event("a-view", "page_view", "2026-09-22T14:01:00Z", "A", { device: "mobile", country: "Chile" }),
  event("a-click", "cta_click", "2026-09-22T14:02:00Z", "A", { device: "mobile", country: "Chile" }),
  event("a-click-2", "whatsapp_click", "2026-09-22T14:02:30Z", "A", { device: "mobile", country: "Chile" }),
  event("a-click-3", "share", "2026-09-22T14:03:00Z", "A", { device: "mobile", country: "Chile" }),
  event("a-click-4", "external_link_click", "2026-09-22T14:03:30Z", "A", { device: "mobile", country: "Chile" }),
  event("a-click-5", "cta_click", "2026-09-22T14:04:00Z", "A", { device: "mobile", country: "Chile" }),
  event("a-click-6", "cta_click", "2026-09-22T14:05:00Z", "A", { device: "mobile", country: "Chile" }),
  event("a-click-7", "cta_click", "2026-09-22T14:06:00Z", "A", { device: "mobile", country: "Chile" }),
  event("a-click-8", "cta_click", "2026-09-22T14:07:00Z", "A", { device: "mobile", country: "Chile" }),
  event("b-view", "page_view", "2026-09-22T14:03:00Z", "B", { device: "desktop", country: "Chile" }),
  event("c-click", "cta_click", "2026-09-22T14:04:00Z", "C", { device: "tablet", country: "Argentina" }),
  ...Array.from({ length: 5 }, (_, i) => event(`previous-${i}`, "page_view", `2026-09-${14 + i}T15:00:00Z`, `P${i}`)),
  ...Array.from({ length: 6 }, (_, i) => event(`current-${i}`, "page_view", `2026-09-2${i + 1}T12:00:00Z`, `W${i}`)),
];

const range7 = resolveRange("7d", now, timezone);
const range30 = resolveRange("30d", now, timezone);
const metrics7 = computeMetrics({ events, range: range7, now, timezone });
const metrics30 = computeMetrics({ events, range: range30, now, timezone });

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(`HARNESS_FAIL: ${message}`);
}

assert(metrics7.monthToDate.views === metrics30.monthToDate.views, "MTD views must ignore dashboard range");
assert(metrics7.monthToDate.interactions === metrics30.monthToDate.interactions, "MTD interactions must ignore dashboard range");
assert(metrics7.records.thisWeekValue === 4, "current calendar week must be Monday-based and exclude future events");
assert(metrics7.records.bestWeekValue === 5, "weekly baseline must use completed previous weeks");
assert(metrics7.devices.find((item) => item.id === "mobile")?.value === 1, "device audience is session-based");
assert(metrics7.countries.find((item) => item.id === "Chile")?.value === 2, "geography is session-based");
assert(metrics7.funnel.map((step) => step.value).join(",") === "1,1,1,0", "funnel requires stage continuity in one session");
assert(metrics7.actionRate <= 1, "action rate cannot exceed 100%");
assert(metrics7.interactionRate > 1, "interactions per view may exceed 100% internally");
assert(resolveWidgets({ ...metrics7, sampleSize: 1 }, "free").find((item) => item.id === "smart_goals")?.visibility === "hidden", "low data must hide before plan locking");

const goals7 = generateSmartGoals({ ...metrics7, sampleSize: 30 }, now, timezone);
const goals30 = generateSmartGoals({ ...metrics30, sampleSize: 30 }, now, timezone);
assert(JSON.stringify(goals7) === JSON.stringify(goals30), "goals must remain MTD-stable across visible ranges");

const mapped = toAnalyticsEventV1({
  id: "legacy-1",
  profile_id: "profile-1",
  page_id: "page-1",
  event_type: "link_click",
  target_url: "https://wa.me/56900000000",
  created_at: now.toISOString(),
  session_id: "session-1",
}, { scope: "page" });
assert(mapped.eventType === "whatsapp_click", "legacy WhatsApp click normalizes deterministically");
assert(mapped.pageId === "page-1" && mapped.sessionId === "session-1", "adapter preserves page and session identity");

console.log("PHASE_A_HARNESS_PASS");
