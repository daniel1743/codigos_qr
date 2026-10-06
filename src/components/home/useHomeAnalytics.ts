import { useEffect, useState } from "react";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import {
  ANALYTICS_READ_TIMEZONE,
  analyticsPeriodFromDays,
  analyticsSummaryFromReadModel,
  readAnalyticsForPage,
} from "../../services/analyticsRealDataService";
import type {
  AnalyticsEventV1,
  AnalyticsMetricsV1,
} from "../intelligent-analytics";
import type { PageAnalyticsSummary } from "../../types/analytics";

/**
 * F2 — Home / Command Center: READ-ONLY consumption of the unified Analytics
 * read model. Home and Analytics share the same adapter, range, timezone and
 * metrics engine; Home never aggregates `view`/`link_click` by itself.
 */

export type HomeAnalyticsStatus = "idle" | "loading" | "ready" | "error";

export type HomeAnalyticsState = {
  status: HomeAnalyticsStatus;
  summary: PageAnalyticsSummary | null;
  metrics: AnalyticsMetricsV1 | null;
  events: AnalyticsEventV1[];
  truncated: boolean;
  days: number;
};

export function hasAnalyticsActivity(summary: PageAnalyticsSummary | null): boolean {
  if (!summary) return false;
  return (
    summary.visits > 0 ||
    summary.buttonClicks > 0 ||
    summary.whatsappClicks > 0 ||
    summary.productClicks > 0 ||
    summary.serviceClicks > 0
  );
}

export function useHomeAnalytics(pageId: string | null, days = 30): HomeAnalyticsState {
  const supabase = getBrowserSupabaseClient();
  const [state, setState] = useState<HomeAnalyticsState>({
    status: pageId ? "loading" : "idle",
    summary: null,
    metrics: null,
    events: [],
    truncated: false,
    days,
  });

  useEffect(() => {
    if (!pageId) {
      setState({
        status: "idle",
        summary: null,
        metrics: null,
        events: [],
        truncated: false,
        days,
      });
      return;
    }
    let active = true;
    setState({
      status: "loading",
      summary: null,
      metrics: null,
      events: [],
      truncated: false,
      days,
    });
    void (async () => {
      try {
        const model = await readAnalyticsForPage({
          supabase,
          pageId,
          period: analyticsPeriodFromDays(days),
          timezone: ANALYTICS_READ_TIMEZONE,
        });
        if (active) {
          setState({
            status: "ready",
            summary: analyticsSummaryFromReadModel(model),
            metrics: model.metrics,
            events: model.events,
            truncated: model.truncated,
            days,
          });
        }
      } catch (error) {
        console.error("Error loading Home analytics summary:", error);
        if (active) {
          setState({
            status: "error",
            summary: null,
            metrics: null,
            events: [],
            truncated: false,
            days,
          });
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [pageId, days, supabase]);

  return state;
}

export default useHomeAnalytics;
