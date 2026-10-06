import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { analyticsService } from "../analyticsService";

function fakeSupabase(events: unknown[]) {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "gte", "lt", "lte", "order", "range"]) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    };
  }
  builder.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve({ data: events, error: null }).then(resolve);
  return {
    from: () => builder,
    calls,
  } as unknown as SupabaseClient & { calls: typeof calls };
}

const EVENT_BASE = {
  id: "event-1",
  profile_id: "profile-1",
  page_id: "page-a",
  country: null,
  city: null,
  user_agent: null,
  created_at: "2026-09-17T12:00:00Z",
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-22T15:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("analyticsService.getPageAnalytics", () => {
  it("aggregates only the selected page using simple business metrics", async () => {
    const fake = fakeSupabase([
      { ...EVENT_BASE, id: "view-a", event_type: "view" },
      { ...EVENT_BASE, id: "button-a", event_type: "link_click", interaction_type: "button" },
      { ...EVENT_BASE, id: "wa-a", event_type: "link_click", interaction_type: "whatsapp" },
      {
        ...EVENT_BASE,
        id: "product-a",
        event_type: "link_click",
        interaction_type: "product",
        item_label: "Corte",
      },
      {
        ...EVENT_BASE,
        id: "service-a",
        event_type: "link_click",
        interaction_type: "service",
        item_label: "Color",
      },
    ]);

    await expect(analyticsService.getPageAnalytics(fake, "page-a", 30)).resolves.toMatchObject({
      visits: 1,
      sessions: 0,
      buttonClicks: 4,
      whatsappClicks: 1,
      productClicks: 0,
      serviceClicks: 0,
      topProducts: [],
      topServices: [],
    });
    expect(fake.calls).toContainEqual({ method: "eq", args: ["page_id", "page-a"] });
  });
});
