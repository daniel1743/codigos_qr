import { useEffect, useState } from "react";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import { analyticsService } from "../../services/analyticsService";
import type { PageAnalyticsSummary } from "../../types/analytics";

/**
 * F2 — Home / Command Center: READ-ONLY consumption of the existing legacy
 * Analytics page summary (`analyticsService.getPageAnalytics`, same contract used
 * by the Analytics screen's legacy presentation).
 *
 * F2 does NOT modify analytics engines, services, contracts, the widget registry,
 * capability gates, events, SQL/RPC, nor the `legacy`/`real` mode switch. This hook
 * only reads an already-existing aggregate for the owner's primary page.
 */

export type HomeAnalyticsStatus = "idle" | "loading" | "ready" | "error";

export type HomeAnalyticsState = {
  status: HomeAnalyticsStatus;
  summary: PageAnalyticsSummary | null;
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
    days,
  });

  useEffect(() => {
    if (!pageId) {
      setState({ status: "idle", summary: null, days });
      return;
    }
    let active = true;
    setState({ status: "loading", summary: null, days });
    void (async () => {
      try {
        const summary = await analyticsService.getPageAnalytics(supabase, pageId, days);
        if (active) setState({ status: "ready", summary, days });
      } catch (error) {
        console.error("Error loading Home analytics summary:", error);
        if (active) setState({ status: "error", summary: null, days });
      }
    })();
    return () => {
      active = false;
    };
  }, [pageId, days, supabase]);

  return state;
}

export default useHomeAnalytics;
