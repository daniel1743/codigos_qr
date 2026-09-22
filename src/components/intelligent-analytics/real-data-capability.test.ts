import { describe, expect, it } from "vitest";
import type { AnalyticsMetricsV1, PlanId, WidgetId } from "./analytics.types";
import {
  SESSION_DEPENDENT_WIDGET_IDS,
  inferAvailability,
  resolveRealDataWidgets,
} from "./real-data-capability";

function makeMetrics(): AnalyticsMetricsV1 {
  // Minimal-but-sufficient shape so every widget's hasData() returns true.
  const metrics = {
    recentEvents: [{ id: "e", eventType: "page_view", timestamp: "2026-09-22T00:00:00Z", profileId: "p" }],
    series: { views: [{ key: "d", label: "d", value: 1 }] },
    channels: [{ channel: "whatsapp" }],
    topLinks: [{ id: "l", label: "l", value: 1 }],
    hourly: [{ value: 1 }],
    sampleSize: 100,
    comparisons: { views: { current: 1, previous: 1 } },
    sources: [{ id: "direct", label: "Direct", value: 1 }],
    devices: [{ id: "mobile", label: "Mobile", value: 1 }],
    totals: { visitors: 5 },
    funnel: [{ id: "page_view", label: "Page view", value: 1 }],
    countries: [{ id: "CL", label: "Chile", value: 1 }],
    cities: [{ id: "stgo", label: "Santiago", value: 1 }],
  };
  return metrics as unknown as AnalyticsMetricsV1;
}

describe("resolveRealDataWidgets", () => {
  it("hides session-dependent widgets when session_id is unavailable", () => {
    const decisions = resolveRealDataWidgets(makeMetrics(), "business" as PlanId, {
      sessionTracking: false,
      qrProvenance: false,
      hasGeography: false,
      hasDevice: false,
      hasTrafficSource: false,
    });

    for (const id of SESSION_DEPENDENT_WIDGET_IDS) {
      const decision = decisions.find((item) => item.id === id);
      expect(decision, `widget ${id}`).toBeDefined();
      expect(decision?.visibility).toBe("hidden");
    }
  });

  it("keeps session-dependent widgets available when session_id is present", () => {
    const decisions = resolveRealDataWidgets(makeMetrics(), "business" as PlanId, {
      sessionTracking: true,
      qrProvenance: true,
      hasGeography: true,
      hasDevice: true,
      hasTrafficSource: true,
    });

    for (const id of SESSION_DEPENDENT_WIDGET_IDS as WidgetId[]) {
      const decision = decisions.find((item) => item.id === id);
      expect(decision?.visibility).not.toBe("hidden");
    }
  });
});

describe("inferAvailability", () => {
  it("reports session/QR availability only when a record proves them", () => {
    const availability = inferAvailability([
      {
        id: "1",
        eventType: "page_view",
        timestamp: "2026-09-22T00:00:00Z",
        profileId: "p",
      },
    ]);
    expect(availability.sessionTracking).toBe(false);
    expect(availability.qrProvenance).toBe(false);
  });
});
