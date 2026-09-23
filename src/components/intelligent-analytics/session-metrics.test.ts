/**
 * CRIPQER Analytics V1.1 — Phase C2B3 session-dependent metrics tests.
 *
 * These tests exercise the SAME `computeMetrics` engine the real-data
 * dashboard renders, fed with events that mirror the 8 QA sessions persisted
 * through the canonical write boundary (see scripts/qa-c2b3-session-matrix.mjs).
 *
 * No network, no Supabase. Deterministic (injected clock + range + timezone).
 */
import { describe, expect, it } from "vitest";
import type { AnalyticsEventV1 } from "./analytics.types";
import { computeMetrics } from "./metrics-engine";

const TZ = "America/Santiago";
const NOW = new Date("2026-09-22T20:00:00.000Z");
const RANGE = { from: "2026-09-22T00:00:00.000Z", to: "2026-09-23T00:00:00.000Z" };

let seq = 0;
function evt(
  eventType: AnalyticsEventV1["eventType"],
  sessionId: string,
  overrides: Partial<AnalyticsEventV1> = {},
): AnalyticsEventV1 {
  seq += 1;
  return {
    id: `evt-${seq}`,
    eventType,
    timestamp: `2026-09-22T1${(seq % 9).toString()}:00:00.000Z`,
    profileId: "profile-qa",
    pageId: "page-qa",
    sessionId,
    ...overrides,
  };
}

/** The 8-session matrix (identical to the persisted QA run). */
function buildMatrix(): AnalyticsEventV1[] {
  const events: AnalyticsEventV1[] = [];
  const push = (sessionId: string, type: AnalyticsEventV1["eventType"], overrides = {}) =>
    events.push(evt(type, sessionId, overrides));

  const s1 = "qa-s1";
  const s2 = "qa-s2";
  const s3 = "qa-s3";
  const s4 = "qa-s4";
  const s5 = "qa-s5";
  const s6 = "qa-s6";
  const s7 = "qa-s7";
  const s8 = "qa-s8";

  push(s1, "session_start");
  push(s1, "page_view");
  push(s2, "session_start");
  push(s2, "page_view");
  push(s2, "cta_click", { itemId: "qa-hero", itemLabel: "Agendar consulta QA" });
  push(s3, "session_start");
  push(s3, "page_view");
  push(s3, "whatsapp_click", {
    platform: "whatsapp",
    itemId: "qa-whatsapp",
    itemLabel: "WhatsApp QA",
  });
  push(s4, "session_start");
  push(s4, "page_view");
  push(s4, "instagram_click", {
    platform: "instagram",
    itemId: "qa-instagram",
    itemLabel: "Instagram QA",
  });
  push(s5, "session_start", { source: "direct" });
  push(s5, "page_view", { source: "direct" });
  push(s5, "external_link_click", {
    source: "direct",
    itemId: "qa-external",
    itemLabel: "Sitio externo",
  });
  push(s6, "session_start");
  push(s6, "page_view");
  push(s6, "cta_click", { itemId: "qa-hero" });
  push(s6, "whatsapp_click", { platform: "whatsapp", itemId: "qa-whatsapp" });
  push(s7, "session_start", { utmSource: "qa_source", utmCampaign: "qa_campaign" });
  push(s7, "page_view", { utmSource: "qa_source", utmCampaign: "qa_campaign" });
  push(s7, "cta_click", { itemId: "qa-hero" });
  push(s7, "whatsapp_click", { platform: "whatsapp", itemId: "qa-whatsapp" });
  push(s7, "instagram_click", { platform: "instagram", itemId: "qa-instagram" });
  push(s7, "external_link_click", { itemId: "qa-external" });
  push(s8, "session_start");
  push(s8, "page_view");

  return events;
}

describe("Phase C2B3 — session-dependent metrics (action rate)", () => {
  it("computes action rate = sessions with action / sessions with page_view", () => {
    const metrics = computeMetrics({ events: buildMatrix(), range: RANGE, now: NOW, timezone: TZ });
    expect(metrics.totals.views).toBe(8);
    expect(metrics.actionRate).toBeCloseTo(0.75, 5);
  });

  it("counts multiple actions in the same session ONCE in the numerator", () => {
    const metrics = computeMetrics({ events: buildMatrix(), range: RANGE, now: NOW, timezone: TZ });
    expect(metrics.totals.interactions).toBe(10);
    expect(metrics.actionRate * metrics.totals.views).toBeCloseTo(6, 5);
  });

  it("keeps the action rate within 0..1", () => {
    const metrics = computeMetrics({ events: buildMatrix(), range: RANGE, now: NOW, timezone: TZ });
    expect(metrics.actionRate).toBeGreaterThanOrEqual(0);
    expect(metrics.actionRate).toBeLessThanOrEqual(1);
  });

  it("counts distinct sessions (no aggregation of unrelated sessions)", () => {
    const metrics = computeMetrics({ events: buildMatrix(), range: RANGE, now: NOW, timezone: TZ });
    expect(metrics.totals.sessions).toBe(8);
    expect(metrics.totals.qrScans).toBe(0);
  });
});

describe("Phase C2B3 — session funnel (current QR-anchored behavior)", () => {
  it("anchors the funnel on qr_scan; without qr_scan all stages stay zero", () => {
    const metrics = computeMetrics({ events: buildMatrix(), range: RANGE, now: NOW, timezone: TZ });
    // Current engine: no qr_scan persisted => QR/Page/Interaction/Action all 0.
    // Truthful (no fabrication), but the no-QR funnel is NOT_SUPPORTED_YET.
    const byId = Object.fromEntries(metrics.funnel.map((step) => [step.id, step.value]));
    expect(byId["qr_scan"]).toBe(0);
    expect(byId["page_view"]).toBe(0);
    expect(byId["interaction"]).toBe(0);
    expect(byId["channel_action"]).toBe(0);
  });
});

describe("Phase C2B3 — channel performance", () => {
  it("counts each channel from canonical platform events", () => {
    const metrics = computeMetrics({ events: buildMatrix(), range: RANGE, now: NOW, timezone: TZ });
    const clicks = Object.fromEntries(metrics.channels.map((c) => [c.channel, c.clicks]));
    expect(clicks["whatsapp"]).toBe(3);
    expect(clicks["instagram"]).toBe(2);
    expect(clicks["other"]).toBe(2); // external_link_click
  });
});

describe("Phase C2B3 — traffic sources / UTM", () => {
  it("attributes source at session entry; utm is preserved exactly", () => {
    const metrics = computeMetrics({ events: buildMatrix(), range: RANGE, now: NOW, timezone: TZ });
    const byId = Object.fromEntries(metrics.sources.map((s) => [s.id, s.value]));
    expect(byId["direct"]).toBe(7);
    expect(byId["utm:qa_source"]).toBe(1);
  });

  it("does not transform a session source into a social platform on later clicks", () => {
    const metrics = computeMetrics({ events: buildMatrix(), range: RANGE, now: NOW, timezone: TZ });
    const ids = metrics.sources.map((s) => s.id);
    expect(ids).toContain("utm:qa_source");
    expect(ids).not.toContain("instagram");
  });
});

describe("Phase C2B3 — top links (current behavior)", () => {
  it("documents the known limitation: top links are empty (entryEvents filter bug)", () => {
    // Finding (C2B3): computeMetrics builds `topLinks` from `entryEvents`
    // (session_start + view events) and then skips non-interaction events,
    // which are ALL of them. The result is always an empty ranking even when
    // real clicks are persisted. Documented as NOT_SUPPORTED_YET; the fix is
    // to rank over `current` interaction events grouped by item_id/item_label.
    const metrics = computeMetrics({ events: buildMatrix(), range: RANGE, now: NOW, timezone: TZ });
    expect(metrics.topLinks).toHaveLength(0);
  });
});
