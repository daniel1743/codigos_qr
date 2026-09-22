import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  analyticsRealDataService,
  realDataPeriodBounds,
  REAL_ANALYTICS_ROW_LIMIT,
} from "../analyticsRealDataService";

function fakeSupabase(events: unknown[]) {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "gte", "lt", "order", "limit"]) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    };
  }
  builder["then"] = (resolve: (value: unknown) => unknown) =>
    Promise.resolve({ data: events, error: null }).then(resolve);
  return {
    from: () => builder,
    calls,
  } as unknown as SupabaseClient & { calls: typeof calls };
}

const VIEW = {
  id: "v1",
  profile_id: "profile-1",
  page_id: "page-a",
  event_type: "view",
  created_at: "2026-09-20T12:00:00Z",
  session_id: null,
};

describe("realDataPeriodBounds", () => {
  const now = new Date("2026-09-22T15:00:00.000Z");

  it("produces a bounded, deterministic window for every supported period", () => {
    for (const period of ["today", "7d", "30d", "90d"] as const) {
      const bounds = realDataPeriodBounds(period, now, "America/Santiago");
      expect(Date.parse(bounds.from)).toBeLessThan(Date.parse(bounds.to));
      expect(Date.parse(bounds.to) - Date.parse(bounds.from)).toBeLessThanOrEqual(91 * 86_400_000);
    }
  });

  it("keeps the 90d window within the documented maximum", () => {
    const bounds = realDataPeriodBounds("90d", now, "America/Santiago");
    const spanDays = (Date.parse(bounds.to) - Date.parse(bounds.from)) / 86_400_000;
    expect(spanDays).toBeLessThanOrEqual(90);
  });
});

describe("analyticsRealDataService.getRealPageEvents", () => {
  it("runs a bounded, ownership-scoped query and maps through the adapter", async () => {
    const fake = fakeSupabase([VIEW]);
    const bounds = realDataPeriodBounds("30d", new Date("2026-09-22T15:00:00.000Z"), "America/Santiago");

    const result = await analyticsRealDataService.getRealPageEvents(fake, "page-a", bounds);

    expect(result.rows).toBe(1);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.eventType).toBe("page_view");
    expect(result.events[0]?.pageId).toBe("page-a");
    expect(result.events[0]?.sessionId).toBeUndefined();

    expect(fake.calls).toContainEqual({ method: "eq", args: ["page_id", "page-a"] });
    expect(fake.calls).toContainEqual({ method: "gte", args: ["created_at", bounds.from] });
    expect(fake.calls).toContainEqual({ method: "lt", args: ["created_at", bounds.to] });
    expect(fake.calls).toContainEqual({ method: "order", args: ["created_at", { ascending: false }] });
    expect(fake.calls).toContainEqual({ method: "limit", args: [REAL_ANALYTICS_ROW_LIMIT] });
  });
});
