import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  computeMetrics,
  type CripqerLegacyAnalyticsEvent,
} from "../../components/intelligent-analytics";
import {
  ANALYTICS_READ_TIMEZONE,
  analyticsSummaryFromReadModel,
  analyticsRealDataService,
  readAnalyticsForPage,
  realDataPeriodBounds,
} from "../analyticsRealDataService";

const NOW = new Date("2026-10-06T15:00:00.000Z");
const PAGE_ID = "page-a";

type TestRow = CripqerLegacyAnalyticsEvent & { created_at: string };

function row(overrides: Partial<TestRow> = {}): TestRow {
  return {
    id: "event-1",
    profile_id: "profile-1",
    page_id: PAGE_ID,
    event_type: "view",
    created_at: "2026-10-05T12:00:00.000Z",
    ...overrides,
  } as TestRow;
}

/**
 * Minimal in-memory Supabase query double that applies the filters used by the
 * read model and supports both `.limit()` and `.range()`.
 */
function fakeSupabase(rows: TestRow[]) {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const filters: Array<{ op: "eq" | "gte" | "lt"; column: string; value: unknown }> = [];
  let limit: number | null = null;

  const apply = () => {
    const filtered = rows.filter((entry) =>
      filters.every((filter) => {
        const value = (entry as unknown as Record<string, unknown>)[filter.column];
        if (filter.op === "eq") return value === filter.value;
        if (filter.op === "gte") return String(value) >= String(filter.value);
        return String(value) < String(filter.value);
      }),
    );
    return filtered.sort((a, b) => b.created_at.localeCompare(a.created_at));
  };

  const query: Record<string, unknown> = {};
  query.select = (...args: unknown[]) => {
    calls.push({ method: "select", args });
    return query;
  };
  query.eq = (column: string, value: unknown) => {
    calls.push({ method: "eq", args: [column, value] });
    filters.push({ op: "eq", column, value });
    return query;
  };
  query.gte = (column: string, value: unknown) => {
    calls.push({ method: "gte", args: [column, value] });
    filters.push({ op: "gte", column, value });
    return query;
  };
  query.lt = (column: string, value: unknown) => {
    calls.push({ method: "lt", args: [column, value] });
    filters.push({ op: "lt", column, value });
    return query;
  };
  query.order = (...args: unknown[]) => {
    calls.push({ method: "order", args });
    return query;
  };
  query.limit = (...args: unknown[]) => {
    calls.push({ method: "limit", args });
    limit = Number(args[0]);
    return query;
  };
  query.range = (from: number, to: number) => {
    calls.push({ method: "range", args: [from, to] });
    return Promise.resolve({ data: apply().slice(from, to + 1), error: null });
  };
  query.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve({ data: apply().slice(0, limit ?? undefined), error: null }).then(resolve);

  return {
    from: () => query,
    calls,
  } as unknown as SupabaseClient & { calls: typeof calls };
}

describe("unified Analytics read model", () => {
  it("maps legacy historical rows through the canonical adapter", async () => {
    const supabase = fakeSupabase([
      row({ id: "legacy-view", event_type: "view", session_id: "legacy-s1" }),
      row({
        id: "legacy-click",
        event_type: "link_click",
        interaction_type: "whatsapp",
        target_url: "https://wa.me/56900000000",
        session_id: "legacy-s1",
      }),
    ]);

    const model = await readAnalyticsForPage({
      supabase,
      pageId: PAGE_ID,
      period: "30d",
      now: NOW,
      timezone: ANALYTICS_READ_TIMEZONE,
    });

    expect(model.metrics.totals.views).toBe(1);
    expect(model.metrics.totals.sessions).toBe(1);
    expect(model.metrics.totals.interactions).toBe(1);
    expect(analyticsSummaryFromReadModel(model)).toMatchObject({
      visits: 1,
      sessions: 1,
      buttonClicks: 1,
      whatsappClicks: 1,
    });
  });

  it("consumes canonical rows without reinterpretation", async () => {
    const supabase = fakeSupabase([
      row({ id: "session", event_type: "session_start", session_id: "canonical-s1" }),
      row({ id: "view", event_type: "page_view", session_id: "canonical-s1" }),
      row({
        id: "whatsapp",
        event_type: "whatsapp_click",
        platform: "whatsapp",
        session_id: "canonical-s1",
        target_url: "https://wa.me/56900000000",
      }),
      row({
        id: "scan",
        event_type: "qr_scan",
        session_id: "canonical-s0",
        qr_id: PAGE_ID,
        source: "qr",
      }),
    ]);

    const model = await readAnalyticsForPage({
      supabase,
      pageId: PAGE_ID,
      period: "30d",
      now: NOW,
      timezone: ANALYTICS_READ_TIMEZONE,
    });

    expect(model.metrics.totals.views).toBe(1);
    expect(model.metrics.totals.sessions).toBe(2);
    expect(model.metrics.totals.interactions).toBe(1);
    expect(model.metrics.totals.qrScans).toBe(1);
  });

  it("produces deterministic mixed legacy + canonical results", async () => {
    const supabase = fakeSupabase([
      row({ id: "legacy-view", event_type: "view" }),
      row({ id: "canonical-view", event_type: "page_view", session_id: "s1" }),
      row({
        id: "legacy-click",
        event_type: "link_click",
        interaction_type: "button",
        target_url: "https://example.com",
      }),
      row({
        id: "canonical-click",
        event_type: "cta_click",
        session_id: "s1",
        target_url: "https://example.com/cta",
      }),
    ]);

    const model = await readAnalyticsForPage({
      supabase,
      pageId: PAGE_ID,
      period: "30d",
      now: NOW,
      timezone: ANALYTICS_READ_TIMEZONE,
    });

    expect(model.metrics.totals.views).toBe(2);
    expect(model.metrics.totals.interactions).toBe(2);
    expect(analyticsSummaryFromReadModel(model).visits).toBe(2);
    expect(analyticsSummaryFromReadModel(model).buttonClicks).toBe(2);
  });

  it("returns zero consistently for an empty dataset", async () => {
    const model = await readAnalyticsForPage({
      supabase: fakeSupabase([]),
      pageId: PAGE_ID,
      period: "30d",
      now: NOW,
      timezone: ANALYTICS_READ_TIMEZONE,
    });

    expect(model.metrics.totals).toMatchObject({
      views: 0,
      sessions: 0,
      interactions: 0,
      qrScans: 0,
    });
    expect(analyticsSummaryFromReadModel(model)).toMatchObject({
      visits: 0,
      sessions: 0,
      buttonClicks: 0,
      dailyVisits: [],
    });
  });

  it("uses the same inclusive/exclusive date boundaries everywhere", async () => {
    const bounds = realDataPeriodBounds("30d", NOW, ANALYTICS_READ_TIMEZONE);
    const beforeEnd = new Date(Date.parse(bounds.to) - 1).toISOString();
    const atEnd = bounds.to;
    const supabase = fakeSupabase([
      row({ id: "at-start", created_at: bounds.from }),
      row({ id: "before-end", created_at: beforeEnd }),
      row({ id: "at-end", created_at: atEnd }),
    ]);

    const model = await readAnalyticsForPage({
      supabase,
      pageId: PAGE_ID,
      period: "30d",
      now: NOW,
      timezone: ANALYTICS_READ_TIMEZONE,
    });

    expect(model.metrics.totals.views).toBe(2);
  });

  it("uses the same timezone for bounds and temporal grouping", async () => {
    const eventAt = "2026-10-05T02:30:00.000Z";
    const santiago = await readAnalyticsForPage({
      supabase: fakeSupabase([row({ id: "tz", created_at: eventAt })]),
      pageId: PAGE_ID,
      period: "30d",
      now: NOW,
      timezone: "America/Santiago",
    });
    const utc = await readAnalyticsForPage({
      supabase: fakeSupabase([row({ id: "tz", created_at: eventAt })]),
      pageId: PAGE_ID,
      period: "30d",
      now: NOW,
      timezone: "UTC",
    });

    expect(santiago.timezone).toBe("America/Santiago");
    expect(utc.timezone).toBe("UTC");
    expect(santiago.metrics.series.views.find((point) => point.value === 1)?.label).not.toBe(
      utc.metrics.series.views.find((point) => point.value === 1)?.label,
    );
  });

  it("never lets another page contaminate the selected page", async () => {
    const supabase = fakeSupabase([
      row({ id: "page-a-view", page_id: PAGE_ID, event_type: "page_view" }),
      row({ id: "page-b-view", page_id: "page-b", event_type: "page_view" }),
    ]);

    const model = await readAnalyticsForPage({
      supabase,
      pageId: PAGE_ID,
      period: "30d",
      now: NOW,
      timezone: ANALYTICS_READ_TIMEZONE,
    });

    expect(model.metrics.totals.views).toBe(1);
    expect(model.events.every((event) => event.pageId === PAGE_ID)).toBe(true);
  });

  it("keeps Home-compatible summary values tied to the same metrics", async () => {
    const model = await readAnalyticsForPage({
      supabase: fakeSupabase([
        row({ id: "view", event_type: "page_view", session_id: "s1" }),
        row({ id: "click", event_type: "cta_click", session_id: "s1" }),
      ]),
      pageId: PAGE_ID,
      period: "30d",
      now: NOW,
      timezone: ANALYTICS_READ_TIMEZONE,
    });
    const summary = analyticsSummaryFromReadModel(model);

    expect(summary.visits).toBe(model.metrics.totals.views);
    expect(summary.sessions).toBe(model.metrics.totals.sessions);
    expect(summary.buttonClicks).toBe(model.metrics.totals.interactions);
  });

  it("recomputing from the read model events yields the same metrics", async () => {
    const model = await readAnalyticsForPage({
      supabase: fakeSupabase([
        row({ id: "view", event_type: "page_view", session_id: "s1" }),
        row({ id: "click", event_type: "whatsapp_click", session_id: "s1" }),
      ]),
      pageId: PAGE_ID,
      period: "30d",
      now: NOW,
      timezone: ANALYTICS_READ_TIMEZONE,
    });
    const recomputed = computeMetrics({
      events: model.events,
      range: { from: model.from, to: model.to },
      now: NOW,
      timezone: model.timezone,
    });

    expect(recomputed.totals).toEqual(model.metrics.totals);
  });

  it("reads beyond the legacy 2,000-row window without silent truncation", async () => {
    const bounds = realDataPeriodBounds("30d", NOW, ANALYTICS_READ_TIMEZONE);
    const rows = Array.from({ length: 2_001 }, (_, index) =>
      row({
        id: `bulk-${index}`,
        event_type: "page_view",
        created_at: "2026-10-05T12:00:00.000Z",
      }),
    );

    const result = await analyticsRealDataService.getAllRealPageEvents(
      fakeSupabase(rows),
      PAGE_ID,
      bounds,
    );

    expect(result.rows).toBe(2_001);
    expect(result.events).toHaveLength(2_001);
    expect(result.truncated).toBe(false);
  });
});
