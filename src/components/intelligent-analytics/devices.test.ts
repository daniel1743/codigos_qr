import { describe, expect, it } from "vitest";
import type { AnalyticsEventV1 } from "./analytics.types";
import { computeMetrics } from "./metrics-engine";

const TZ = "America/Santiago";
const NOW = new Date("2026-09-22T20:00:00.000Z");
const RANGE = { from: "2026-09-22T00:00:00.000Z", to: "2026-09-23T00:00:00.000Z" };

let seq = 0;
function evt(overrides: Partial<AnalyticsEventV1> = {}): AnalyticsEventV1 {
  seq += 1;
  return {
    id: `evt-${seq}`,
    eventType: "page_view",
    timestamp: `2026-09-22T1${(seq % 9).toString()}:00:00.000Z`,
    profileId: "profile-qa",
    pageId: "page-qa",
    sessionId: `s-${seq}`,
    ...overrides,
  };
}

describe("Phase C2B4A — session-based device aggregation", () => {
  it("counts 5 events with the same session/device as ONE device session", () => {
    const metrics = computeMetrics({
      events: [
        evt({ sessionId: "s1", device: "mobile" }),
        evt({ sessionId: "s1", device: "mobile", eventType: "session_start" }),
        evt({ sessionId: "s1", device: "mobile", eventType: "cta_click", itemId: "a" }),
        evt({ sessionId: "s1", device: "mobile", eventType: "whatsapp_click", itemId: "wa" }),
        evt({ sessionId: "s1", device: "mobile", eventType: "external_link_click", itemId: "ext" }),
      ],
      range: RANGE,
      now: NOW,
      timezone: TZ,
    });
    expect(metrics.devices).toHaveLength(1);
    expect(metrics.devices[0]).toMatchObject({ id: "mobile", label: "Mobile", value: 1 });
  });

  it("aggregates 2 desktop + 2 mobile sessions to 2 and 2 (not raw event counts)", () => {
    const events = [
      // Desktop session 1 — 3 events
      evt({ sessionId: "d1", device: "desktop" }),
      evt({ sessionId: "d1", device: "desktop", eventType: "session_start" }),
      evt({ sessionId: "d1", device: "desktop", eventType: "cta_click", itemId: "a" }),
      // Desktop session 2 — 2 events
      evt({ sessionId: "d2", device: "desktop" }),
      evt({ sessionId: "d2", device: "desktop", eventType: "cta_click", itemId: "a" }),
      // Mobile session 1 — 3 events
      evt({ sessionId: "m1", device: "mobile" }),
      evt({ sessionId: "m1", device: "mobile", eventType: "session_start" }),
      evt({ sessionId: "m1", device: "mobile", eventType: "whatsapp_click", itemId: "wa" }),
      // Mobile session 2 — 2 events
      evt({ sessionId: "m2", device: "mobile" }),
      evt({ sessionId: "m2", device: "mobile", eventType: "instagram_click", itemId: "ig" }),
    ];
    const metrics = computeMetrics({ events, range: RANGE, now: NOW, timezone: TZ });
    const byId = Object.fromEntries(metrics.devices.map((entry) => [entry.id, entry.value]));
    expect(byId["desktop"]).toBe(2);
    expect(byId["mobile"]).toBe(2);
    expect(metrics.devices).toHaveLength(2);
  });

  it("does not count unknown devices in the breakdown", () => {
    const metrics = computeMetrics({
      events: [
        evt({ sessionId: "u1", device: "unknown" }),
        evt({ sessionId: "m1", device: "mobile" }),
      ],
      range: RANGE,
      now: NOW,
      timezone: TZ,
    });
    expect(metrics.devices).toHaveLength(1);
    expect(metrics.devices[0]?.id).toBe("mobile");
  });
});
