import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fromLegacyAnalyticsRecords,
  resolveRange,
  type AnalyticsEventV1,
  type CripqerLegacyAnalyticsEvent,
  type PeriodId,
} from "../components/intelligent-analytics";

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

/** Upper bound of history the real-data mode may request at once. */
export const REAL_ANALYTICS_MAX_DAYS = 90;

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
};
