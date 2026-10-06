import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeMetrics,
  fromLegacyAnalyticsRecords,
  inferAvailability,
  resolveRange,
  type AnalyticsEventV1,
  type AnalyticsMetricsV1,
  type CripqerLegacyAnalyticsEvent,
  type PeriodId,
  type RealDataAvailabilityV1,
} from "../components/intelligent-analytics";
import type { PageAnalyticsSummary } from "../types/analytics";

/**
 * READ-ONLY real-data bridge (Phase C1).
 *
 * Loads a BOUNDED window of persisted `qr_analytics` rows for exactly one page
 * and maps them through the compatibility adapter into AnalyticsEventV1.
 * It never writes, never mutates, and never loads unlimited history.
 *
 * Ownership is enforced at the route layer (`pageService.getOwnPageById`) and
 * again by the `qr_analytics` RLS policy ("Users can read their own analytics"),
 * so a bounded query here can never leak another owner's rows.
 */

/** Hard cap so the browser never receives unbounded history. */
export const REAL_ANALYTICS_ROW_LIMIT = 2000;

/** Read model page size and hard safety cap. */
export const REAL_ANALYTICS_PAGE_SIZE = REAL_ANALYTICS_ROW_LIMIT;
export const REAL_ANALYTICS_MAX_ROWS = 20_000;

/** Upper bound of history the real-data mode may request at once. */
export const REAL_ANALYTICS_MAX_DAYS = 90;

/** Single timezone contract for comparable Home and Analytics metrics. */
export const ANALYTICS_READ_TIMEZONE = "America/Santiago";

/** Maps the existing numeric UI range selector to the canonical period contract. */
export function analyticsPeriodFromDays(days: number): PeriodId {
  if (days <= 1) return "today";
  if (days <= 7) return "7d";
  if (days <= 30) return "30d";
  return "90d";
}

export interface RealDataPeriodBounds {
  /** Inclusive ISO start. */
  from: string;
  /** Exclusive ISO end. */
  to: string;
}

export interface RealPageQueryResult {
  events: AnalyticsEventV1[];
  rows: number;
  truncated: boolean;
  from: string;
  to: string;
}

export interface AnalyticsReadModelResult extends RealPageQueryResult {
  metrics: AnalyticsMetricsV1;
  availability: RealDataAvailabilityV1;
  timezone: string;
}

export interface ReadAnalyticsForPageInput {
  supabase: SupabaseClient;
  pageId: string;
  period: PeriodId;
  now?: Date;
  timezone?: string;
}

/** Deterministic bounded window for a period, matching the dashboard ranges. */
export function realDataPeriodBounds(period: PeriodId, now: Date, timezone: string): RealDataPeriodBounds {
  const range = resolveRange(period, now, timezone);
  return { from: range.from, to: range.to };
}

export const analyticsRealDataService = {
  /**
   * Bounded, deterministic, read-only query for one page.
   * Ordered newest-first and capped at `limit`, so the payload stays bounded.
   */
  async getRealPageEvents(
    supabase: SupabaseClient,
    pageId: string,
    bounds: RealDataPeriodBounds,
    limit: number = REAL_ANALYTICS_ROW_LIMIT,
  ): Promise<RealPageQueryResult> {
    const { data, error } = await supabase
      .from("qr_analytics")
      .select("*")
      .eq("page_id", pageId)
      .gte("created_at", bounds.from)
      .lt("created_at", bounds.to)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    const rows = (data ?? []) as CripqerLegacyAnalyticsEvent[];
    const truncated = rows.length >= limit;
    const events = fromLegacyAnalyticsRecords(rows, { scope: "page" });

    return { events, rows: rows.length, truncated, from: bounds.from, to: bounds.to };
  },

  /**
   * Bounded, paginated read for the unified Analytics read model.
   *
   * The legacy single-page query capped silently at 2,000 rows. This loop
   * removes that silent cap up to a documented safety maximum and reports
   * truncation explicitly if the maximum is reached.
   */
  async getAllRealPageEvents(
    supabase: SupabaseClient,
    pageId: string,
    bounds: RealDataPeriodBounds,
  ): Promise<RealPageQueryResult> {
    const rows: CripqerLegacyAnalyticsEvent[] = [];
    let offset = 0;
    let truncated = false;

    while (true) {
      const { data, error } = await supabase
        .from("qr_analytics")
        .select("*")
        .eq("page_id", pageId)
        .gte("created_at", bounds.from)
        .lt("created_at", bounds.to)
        .order("created_at", { ascending: false })
        .range(offset, offset + REAL_ANALYTICS_PAGE_SIZE - 1);

      if (error) throw error;

      const page = (data ?? []) as CripqerLegacyAnalyticsEvent[];
      rows.push(...page);

      if (page.length < REAL_ANALYTICS_PAGE_SIZE) break;

      offset += page.length;
      if (rows.length >= REAL_ANALYTICS_MAX_ROWS) {
        truncated = true;
        break;
      }
    }

    const events = fromLegacyAnalyticsRecords(rows, { scope: "page" });
    return { events, rows: rows.length, truncated, from: bounds.from, to: bounds.to };
  },
};

/**
 * The ONE read model used by Home, the legacy-compatible Analytics view and
 * the real dashboard. Legacy rows are normalized by the existing adapter;
 * metrics are computed by the existing canonical engine.
 */
export async function readAnalyticsForPage(
  input: ReadAnalyticsForPageInput,
): Promise<AnalyticsReadModelResult> {
  const timezone = input.timezone ?? ANALYTICS_READ_TIMEZONE;
  const now = input.now ?? new Date();
  const bounds = realDataPeriodBounds(input.period, now, timezone);
  const result = await analyticsRealDataService.getAllRealPageEvents(
    input.supabase,
    input.pageId,
    bounds,
  );
  const metrics = computeMetrics({
    events: result.events,
    range: { from: result.from, to: result.to },
    now,
    timezone,
  });

  return {
    ...result,
    metrics,
    availability: inferAvailability(result.events),
    timezone,
  };
}

/**
 * Compatibility projection for the existing legacy UI. It does not perform a
 * second aggregation: every number comes from the unified read model metrics.
 */
export function analyticsSummaryFromReadModel(
  model: AnalyticsReadModelResult,
): PageAnalyticsSummary {
  const whatsappClicks =
    model.metrics.channels.find((channel) => channel.channel === "whatsapp")?.clicks ?? 0;

  return {
    visits: model.metrics.totals.views,
    sessions: model.metrics.totals.sessions,
    buttonClicks: model.metrics.totals.interactions,
    whatsappClicks,
    // Product/service distinction is intentionally deferred (A3). The canonical
    // V1.1 contract does not expose an itemType yet.
    productClicks: 0,
    serviceClicks: 0,
    topProducts: [],
    topServices: [],
    dailyVisits: model.metrics.series.views
      .filter((point) => point.value > 0)
      .map((point) => ({
        date: point.label,
        count: point.value,
      })),
    truncated: model.truncated,
  };
}
