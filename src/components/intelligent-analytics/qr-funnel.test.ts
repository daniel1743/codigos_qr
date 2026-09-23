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
    timestamp: `2026-09-22T00:00:${String(seq).padStart(2, "0")}.000Z`,
    profileId: "profile-qa",
    pageId: "page-qa",
    sessionId,
    ...overrides,
  };
}

function funnelById(events: AnalyticsEventV1[]) {
  const metrics = computeMetrics({ events, range: RANGE, now: NOW, timezone: TZ });
  return Object.fromEntries(metrics.funnel.map((step) => [step.id, step.value]));
}

describe("Phase C2B4B — QR scan funnel (session/journey)", () => {
  it("full journey: scan → page → interaction → action", () => {
    const events = [
      evt("qr_scan", "s1", { qrId: "qa-page", source: "qr" }),
      evt("session_start", "s1"),
      evt("page_view", "s1"),
      evt("whatsapp_click", "s1", { itemId: "wa", itemLabel: "WhatsApp" }),
      evt("lead_created", "s1"),
    ];
    const metrics = computeMetrics({ events, range: RANGE, now: NOW, timezone: TZ });

    expect(metrics.totals.qrScans).toBe(1);
    expect(metrics.totals.views).toBe(1);
    expect(metrics.totals.interactions).toBe(1);
    expect(metrics.totals.leads).toBe(1);

    const funnel = funnelById(events);
    expect(funnel["qr_scan"]).toBe(1);
    expect(funnel["page_view"]).toBe(1);
    expect(funnel["interaction"]).toBe(1);
    expect(funnel["channel_action"]).toBe(1);
  });

  it("scan → page → no action drops after page", () => {
    const events = [evt("qr_scan", "s1", { qrId: "qa-page" }), evt("page_view", "s1")];
    const funnel = funnelById(events);

    expect(funnel["qr_scan"]).toBe(1);
    expect(funnel["page_view"]).toBe(1);
    expect(funnel["interaction"]).toBe(0);
    expect(funnel["channel_action"]).toBe(0);
  });

  it("direct page visit is NOT a qr_scan", () => {
    const metrics = computeMetrics({
      events: [evt("page_view", "s1")],
      range: RANGE,
      now: NOW,
      timezone: TZ,
    });

    expect(metrics.totals.qrScans).toBe(0);
    expect(metrics.totals.views).toBe(1);
    expect(funnelById([evt("page_view", "s2")])["qr_scan"]).toBe(0);
  });

  it("shared direct link is NOT a qr_scan", () => {
    const metrics = computeMetrics({
      events: [evt("page_view", "s1"), evt("cta_click", "s1", { itemId: "cta" })],
      range: RANGE,
      now: NOW,
      timezone: TZ,
    });
    expect(metrics.totals.qrScans).toBe(0);
    expect(metrics.totals.views).toBe(1);
  });

  it("counts two distinct legitimate QR journeys as two scans", () => {
    const events = [
      evt("qr_scan", "s1", { qrId: "qa-page" }),
      evt("page_view", "s1"),
      evt("qr_scan", "s2", { qrId: "qa-page" }),
      evt("page_view", "s2"),
    ];
    const metrics = computeMetrics({ events, range: RANGE, now: NOW, timezone: TZ });
    expect(metrics.totals.qrScans).toBe(2);
    expect(funnelById(events)["qr_scan"]).toBe(2);
  });

  it("qr_scan does not inflate interactions / channels / top links / devices", () => {
    const events = [
      evt("qr_scan", "s1", { qrId: "qa-page" }),
      evt("session_start", "s1"),
      evt("page_view", "s1"),
      evt("whatsapp_click", "s1", { itemId: "wa", itemLabel: "WhatsApp" }),
    ];
    const metrics = computeMetrics({ events, range: RANGE, now: NOW, timezone: TZ });

    // qr_scan is not an interaction: exactly one interaction (the whatsapp click).
    expect(metrics.totals.interactions).toBe(1);
    // channels count only channel clicks, never qr_scan.
    const clicks = Object.fromEntries(metrics.channels.map((c) => [c.channel, c.clicks]));
    expect(clicks["whatsapp"]).toBe(1);
    // top links never list qr_scan.
    expect(metrics.topLinks.map((entry) => entry.id)).not.toContain("qr_scan");
  });
});
