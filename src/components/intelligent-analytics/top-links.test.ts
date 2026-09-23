import { describe, expect, it } from "vitest";
import type { AnalyticsEventV1 } from "./analytics.types";
import { computeMetrics } from "./metrics-engine";

const TZ = "America/Santiago";
const NOW = new Date("2026-09-22T20:00:00.000Z");
const RANGE = { from: "2026-09-22T00:00:00.000Z", to: "2026-09-23T00:00:00.000Z" };

let seq = 0;
function evt(
  eventType: AnalyticsEventV1["eventType"],
  overrides: Partial<AnalyticsEventV1> = {},
): AnalyticsEventV1 {
  seq += 1;
  return {
    id: `evt-${seq}`,
    eventType,
    timestamp: `2026-09-22T1${(seq % 9).toString()}:00:00.000Z`,
    profileId: "profile-qa",
    pageId: "page-qa",
    sessionId: `s-${seq}`,
    ...overrides,
  };
}

function run(events: AnalyticsEventV1[]) {
  return computeMetrics({ events, range: RANGE, now: NOW, timezone: TZ });
}

describe("Phase C2B4A — Top Links regression", () => {
  it("surfaces a single link click", () => {
    const metrics = run([evt("cta_click", { itemId: "a", linkLabel: "A" })]);
    expect(metrics.topLinks).toHaveLength(1);
    expect(metrics.topLinks[0]).toMatchObject({ id: "a", label: "A", value: 1 });
  });

  it("ranks three clicks on A above one click on B", () => {
    const metrics = run([
      evt("cta_click", { itemId: "a", linkLabel: "A" }),
      evt("cta_click", { itemId: "a", linkLabel: "A" }),
      evt("cta_click", { itemId: "a", linkLabel: "A" }),
      evt("cta_click", { itemId: "b", linkLabel: "B" }),
    ]);
    const ids = metrics.topLinks.map((entry) => entry.id);
    expect(ids[0]).toBe("a");
    expect(ids[1]).toBe("b");
    expect(metrics.topLinks[0]?.value).toBe(3);
    expect(metrics.topLinks[1]?.value).toBe(1);
  });

  it("never lists page_view as a Top Link", () => {
    const metrics = run([evt("page_view"), evt("cta_click", { itemId: "a", linkLabel: "A" })]);
    expect(metrics.topLinks.map((entry) => entry.id)).not.toContain("page_view");
  });

  it("never lists session_start as a Top Link", () => {
    const metrics = run([evt("session_start"), evt("cta_click", { itemId: "a", linkLabel: "A" })]);
    expect(metrics.topLinks.map((entry) => entry.id)).not.toContain("session_start");
  });

  it("ranks mixed social/external/CTA clicks by their canonical identity", () => {
    const metrics = run([
      evt("whatsapp_click", { platform: "whatsapp", itemId: "wa", linkLabel: "WhatsApp" }),
      evt("whatsapp_click", { platform: "whatsapp", itemId: "wa", linkLabel: "WhatsApp" }),
      evt("instagram_click", { platform: "instagram", itemId: "ig", linkLabel: "Instagram" }),
      evt("external_link_click", { itemId: "ext", linkLabel: "External" }),
      evt("cta_click", { itemId: "cta", linkLabel: "CTA" }),
      evt("cta_click", { itemId: "cta", linkLabel: "CTA" }),
      evt("cta_click", { itemId: "cta", linkLabel: "CTA" }),
    ]);
    const byId = Object.fromEntries(metrics.topLinks.map((entry) => [entry.id, entry.value]));
    expect(metrics.topLinks).toHaveLength(4);
    expect(byId["cta"]).toBe(3);
    expect(byId["wa"]).toBe(2);
    expect(byId["ig"]).toBe(1);
    expect(byId["ext"]).toBe(1);
    expect(metrics.topLinks[0]?.id).toBe("cta");
  });

  it("keeps channel metrics unchanged while Top Links are populated", () => {
    const metrics = run([
      evt("whatsapp_click", { platform: "whatsapp", itemId: "wa", linkLabel: "WhatsApp" }),
      evt("whatsapp_click", { platform: "whatsapp", itemId: "wa", linkLabel: "WhatsApp" }),
      evt("instagram_click", { platform: "instagram", itemId: "ig", linkLabel: "Instagram" }),
    ]);
    const clicks = Object.fromEntries(metrics.channels.map((c) => [c.channel, c.clicks]));
    expect(clicks["whatsapp"]).toBe(2);
    expect(clicks["instagram"]).toBe(1);
    expect(metrics.topLinks).toHaveLength(2);
  });
});
