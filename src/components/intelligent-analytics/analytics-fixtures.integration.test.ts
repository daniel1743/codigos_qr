import { describe, expect, it } from "vitest";
import { ANALYTICS_SCENARIOS, buildScenarioEvents } from "./analytics.fixtures";
import { computeMetrics, resolveRange } from "./metrics-engine";
import { resolveWidgets } from "./widget-registry";

describe("analytics UI host fixture contract", () => {
  it("builds every Phase B scenario with the explicit host timezone", () => {
    const now = new Date("2026-09-22T15:00:00.000Z");

    for (const scenario of ANALYTICS_SCENARIOS) {
      const events = buildScenarioEvents(scenario.id, now, "owned-profile");
      const range = resolveRange("30d", now, "America/Santiago");
      const metrics = computeMetrics({
        events,
        range,
        now,
        timezone: "America/Santiago",
      });

      expect(events.every((event) => event.profileId === "owned-profile")).toBe(true);
      expect(metrics.version).toBe("1");
      expect(resolveWidgets(metrics, "free")).toBeTruthy();
    }
  }, 30_000);
});
