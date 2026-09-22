/**
 * CRIPQER INTELLIGENT ANALYTICS V1 — deterministic demo datasets.
 *
 * Seeded pseudo-random generator: the same scenario always produces the same
 * events, so screenshots, tests and QA stay stable.
 */

import type { AnalyticsEventType, AnalyticsEventV1, ChannelId, DeviceKind } from "./analytics.types";

export type ScenarioId =
  | "new_user"
  | "growing_business"
  | "declining_business"
  | "viral_spike"
  | "whatsapp_heavy"
  | "rolling_instagram_spike"
  | "goal_at_risk"
  | "goal_success_projection"
  | "hot_window"
  | "weekly_record"
  | "no_data";

export interface ScenarioSpec {
  id: ScenarioId;
  label: string;
  description: string;
}

export const ANALYTICS_SCENARIOS: ScenarioSpec[] = [
  { id: "no_data", label: "No data", description: "Brand new page, zero activity." },
  { id: "new_user", label: "New user", description: "First signals, learning mode." },
  { id: "growing_business", label: "Growing", description: "Healthy upward trend across channels." },
  { id: "declining_business", label: "Declining", description: "Traffic and engagement cooling down." },
  { id: "viral_spike", label: "Viral spike", description: "Sudden anomaly from a single campaign." },
  { id: "whatsapp_heavy", label: "WhatsApp heavy", description: "One channel dominates everything." },
  {
    id: "rolling_instagram_spike",
    label: "Realtime Instagram spike",
    description: "A burst of Instagram clicks inside the last 45 minutes.",
  },
  { id: "goal_at_risk", label: "Goal at risk", description: "Pace below the monthly target." },
  {
    id: "goal_success_projection",
    label: "Goal on track",
    description: "Projected to pass the monthly target.",
  },
  { id: "hot_window", label: "Hot time window", description: "Activity concentrated in one hour." },
  { id: "weekly_record", label: "Weekly record", description: "Strongest week on record." },
];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COUNTRIES = ["Spain", "Mexico", "Colombia", "Argentina", "United States", "Chile"];
const CITIES = ["Madrid", "Barcelona", "Mexico City", "Bogotá", "Buenos Aires", "Miami"];
const DEVICES: DeviceKind[] = ["mobile", "mobile", "mobile", "desktop", "tablet"];
const SOURCES = ["direct", "instagram", "referrer", "qr"];

const LINKS: Array<{ id: string; label: string; type: AnalyticsEventType; channel: ChannelId }> = [
  { id: "link_whatsapp", label: "Chat on WhatsApp", type: "whatsapp_click", channel: "whatsapp" },
  { id: "link_instagram", label: "Instagram profile", type: "instagram_click", channel: "instagram" },
  { id: "link_menu", label: "See the menu", type: "external_link_click", channel: "other" },
  { id: "link_tiktok", label: "TikTok", type: "tiktok_click", channel: "tiktok" },
  { id: "link_booking", label: "Book an appointment", type: "cta_click", channel: "other" },
  { id: "link_facebook", label: "Facebook page", type: "facebook_click", channel: "facebook" },
];

interface ScenarioProfile {
  days: number;
  baseViews: number;
  /** Multiplier applied across the window, from oldest to newest. */
  trend: (progress: number) => number;
  ctr: number;
  leadRate: number;
  qrRate: number;
  channelWeights: Partial<Record<string, number>>;
  spikeDayFromEnd?: number;
  spikeMultiplier?: number;
  /** Forces every visit into a single hour of the day. */
  peakHour?: number;
  /** Injects a realtime burst inside the last N minutes (V1.1 fixtures). */
  realtimeBurst?: { linkId: string; count: number; minutes: number };
}

const PROFILES: Record<ScenarioId, ScenarioProfile> = {
  no_data: { days: 30, baseViews: 0, trend: () => 0, ctr: 0, leadRate: 0, qrRate: 0, channelWeights: {} },
  new_user: {
    days: 30,
    baseViews: 1,
    trend: (p) => 0.6 + p * 0.8,
    ctr: 0.25,
    leadRate: 0.02,
    qrRate: 0.15,
    channelWeights: { link_whatsapp: 3, link_instagram: 2, link_menu: 1 },
  },
  growing_business: {
    days: 60,
    baseViews: 22,
    trend: (p) => 0.55 + p * 1.15,
    ctr: 0.34,
    leadRate: 0.05,
    qrRate: 0.22,
    channelWeights: { link_whatsapp: 5, link_instagram: 4, link_menu: 3, link_booking: 3, link_tiktok: 2, link_facebook: 1 },
  },
  declining_business: {
    days: 60,
    baseViews: 30,
    trend: (p) => 1.5 - p * 0.95,
    ctr: 0.18,
    leadRate: 0.02,
    qrRate: 0.12,
    channelWeights: { link_whatsapp: 4, link_instagram: 3, link_menu: 2, link_facebook: 2 },
  },
  viral_spike: {
    days: 45,
    baseViews: 18,
    trend: (p) => 0.8 + p * 0.3,
    ctr: 0.3,
    leadRate: 0.04,
    qrRate: 0.3,
    channelWeights: { link_tiktok: 6, link_instagram: 4, link_whatsapp: 3, link_menu: 2 },
    spikeDayFromEnd: 0,
    spikeMultiplier: 6,
  },
  rolling_instagram_spike: {
    days: 45,
    baseViews: 20,
    trend: (p) => 0.9 + p * 0.2,
    ctr: 0.3,
    leadRate: 0.03,
    qrRate: 0.2,
    channelWeights: { link_whatsapp: 4, link_instagram: 3, link_menu: 2, link_booking: 1 },
    realtimeBurst: { linkId: "link_instagram", count: 16, minutes: 45 },
  },
  goal_at_risk: {
    days: 40,
    baseViews: 14,
    trend: (p) => (p > 0.72 ? 0.18 : 1.5 - p * 0.6),
    ctr: 0.2,
    leadRate: 0.02,
    qrRate: 0.14,
    channelWeights: { link_whatsapp: 3, link_instagram: 2, link_menu: 2 },
  },
  goal_success_projection: {
    days: 40,
    baseViews: 24,
    trend: (p) => 0.75 + p * 0.9,
    ctr: 0.36,
    leadRate: 0.06,
    qrRate: 0.24,
    channelWeights: { link_whatsapp: 4, link_instagram: 4, link_booking: 3, link_menu: 2 },
  },
  hot_window: {
    days: 40,
    baseViews: 22,
    trend: (p) => 0.9 + p * 0.3,
    ctr: 0.32,
    leadRate: 0.04,
    qrRate: 0.2,
    channelWeights: { link_whatsapp: 4, link_instagram: 3, link_menu: 2 },
    peakHour: 20,
  },
  weekly_record: {
    days: 45,
    baseViews: 18,
    trend: (p) => (p > 0.85 ? 2.4 : 0.85 + p * 0.2),
    ctr: 0.33,
    leadRate: 0.05,
    qrRate: 0.26,
    channelWeights: { link_whatsapp: 4, link_instagram: 4, link_menu: 2, link_booking: 2 },
  },
  whatsapp_heavy: {
    days: 45,
    baseViews: 26,
    trend: (p) => 0.9 + p * 0.35,
    ctr: 0.42,
    leadRate: 0.08,
    qrRate: 0.4,
    channelWeights: { link_whatsapp: 14, link_instagram: 2, link_menu: 1 },
  },
};

const DAY_MS = 86_400_000;

/** Generates a deterministic event stream ending at `now`. */
export function buildScenarioEvents(scenario: ScenarioId, now: Date, profileId = "demo_profile"): AnalyticsEventV1[] {
  const profile = PROFILES[scenario];
  const random = mulberry32(hash(scenario));
  const events: AnalyticsEventV1[] = [];
  const weighted: string[] = [];
  for (const [id, weight] of Object.entries(profile.channelWeights)) {
    for (let i = 0; i < (weight ?? 0); i += 1) weighted.push(id);
  }

  let counter = 0;
  const push = (
    eventType: AnalyticsEventType,
    time: number,
    extra: Partial<AnalyticsEventV1> = {},
  ) => {
    counter += 1;
    events.push({
      id: `${scenario}_${counter}`,
      eventType,
      timestamp: new Date(time).toISOString(),
      profileId,
      pageId: "page_main",
      smartPageId: "smart_page_main",
      ...extra,
    });
  };

  const endDay = startOfDay(now.getTime());

  for (let dayOffset = profile.days - 1; dayOffset >= 0; dayOffset -= 1) {
    const dayStart = endDay - dayOffset * DAY_MS;
    const progress = profile.days > 1 ? (profile.days - 1 - dayOffset) / (profile.days - 1) : 1;
    let dayViews = Math.round(profile.baseViews * profile.trend(progress) * (0.75 + random() * 0.5));
    if (profile.spikeDayFromEnd !== undefined && dayOffset === profile.spikeDayFromEnd) {
      dayViews = Math.round(dayViews * (profile.spikeMultiplier ?? 1));
    }
    if (dayViews <= 0) continue;

    for (let i = 0; i < dayViews; i += 1) {
      // Two natural peaks: lunch and evening.
      const peak = profile.peakHour ?? (random() < 0.55 ? 13 : 20);
      const spread = profile.peakHour === undefined ? 6 : 1;
      const hour = clamp(Math.round(peak + (random() - 0.5) * spread), 7, 23);
      const time = dayStart + hour * 3_600_000 + Math.floor(random() * 3_600_000);
      const sessionId = `s_${scenario}_${dayOffset}_${i}`;
      const device = DEVICES[Math.floor(random() * DEVICES.length)] ?? "mobile";
      const country = COUNTRIES[Math.floor(random() * COUNTRIES.length)] ?? "Spain";
      const cityApprox = CITIES[Math.floor(random() * CITIES.length)] ?? "Madrid";
      const source = SOURCES[Math.floor(random() * SOURCES.length)] ?? "direct";

      const isQr = random() < profile.qrRate;
      if (isQr) {
        push("qr_scan", time - 20_000, { sessionId, device, country, cityApprox, qrId: "qr_main", source: "qr" });
      }
      push("smart_page_view", time, {
        sessionId,
        device,
        country,
        cityApprox,
        source: isQr ? "qr" : source,
        ...(source === "instagram" ? { utmSource: "instagram", utmCampaign: "bio_link" } : {}),
      });

      if (random() < 0.22) push("return_visit", time + 1_000, { sessionId, device });

      if (random() < profile.ctr && weighted.length > 0) {
        const linkId = weighted[Math.floor(random() * weighted.length)];
        const link = LINKS.find((entry) => entry.id === linkId) ?? LINKS[0];
        if (link) {
          push(link.type, time + 45_000, {
            sessionId,
            device,
            country,
            cityApprox,
            linkId: link.id,
            linkLabel: link.label,
            platform: link.channel,
          });
        }
      }

      if (random() < profile.leadRate) {
        push("lead_created", time + 90_000, { sessionId, device, country, cityApprox });
      }
    }
  }

  /* Realtime burst inside the last minutes (V1.1) --------------------- */
  const burst = profile.realtimeBurst;
  if (burst) {
    const link = LINKS.find((entry) => entry.id === burst.linkId);
    for (let i = 0; i < burst.count && link; i += 1) {
      const time = now.getTime() - Math.floor(random() * burst.minutes * 60_000);
      const sessionId = `s_${scenario}_burst_${i}`;
      const device = DEVICES[Math.floor(random() * DEVICES.length)] ?? "mobile";
      push("smart_page_view", time - 30_000, { sessionId, device, source: "instagram", utmSource: "instagram" });
      push(link.type, time, {
        sessionId,
        device,
        linkId: link.id,
        linkLabel: link.label,
        platform: link.channel,
      });
    }
  }

  return events.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
}

function startOfDay(time: number): number {
  const d = new Date(time);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
