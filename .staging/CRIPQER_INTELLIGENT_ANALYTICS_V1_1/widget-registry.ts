/**
 * CRIPQER INTELLIGENT ANALYTICS V1 — Adaptive Widget Registry.
 *
 * Decides which widgets exist for a given plan and data reality.
 * A widget with no meaningful data is hidden, never rendered empty.
 * A widget above the plan is LOCKED (visible teaser), never fake data.
 */

import { PLAN_ORDER, type AnalyticsMetricsV1, type PlanId, type WidgetDecisionV1, type WidgetId } from "./analytics.types";

interface WidgetSpec {
  id: WidgetId;
  title: string;
  requiredPlan: PlanId;
  /** Does the current data justify showing this widget at all? */
  hasData: (metrics: AnalyticsMetricsV1) => boolean;
  emptyReason: string;
}

const SPECS: WidgetSpec[] = [
  {
    id: "live_activity",
    title: "Live activity",
    requiredPlan: "free",
    hasData: (m) => m.recentEvents.length > 0,
    emptyReason: "No activity recorded yet",
  },
  {
    id: "performance_overview",
    title: "Performance overview",
    requiredPlan: "free",
    hasData: () => true,
    emptyReason: "",
  },
  {
    id: "performance_trend",
    title: "Performance trend",
    requiredPlan: "free",
    hasData: (m) => m.series.views.some((point) => point.value > 0),
    emptyReason: "No views in this period",
  },
  {
    id: "intelligence",
    title: "Cripqer intelligence",
    requiredPlan: "free",
    hasData: () => true,
    emptyReason: "",
  },
  {
    id: "channel_performance",
    title: "Channel performance",
    requiredPlan: "free",
    hasData: (m) => m.channels.length > 0,
    emptyReason: "No channel clicks yet",
  },
  {
    id: "top_links",
    title: "Top links",
    requiredPlan: "free",
    hasData: (m) => m.topLinks.length > 0,
    emptyReason: "No link clicks yet",
  },
  {
    id: "hot_hours",
    title: "Hot hours",
    requiredPlan: "pro",
    hasData: (m) => m.hourly.some((cell) => cell.value > 0),
    emptyReason: "Not enough activity to map timing",
  },
  {
    id: "smart_goals",
    title: "Smart goals",
    requiredPlan: "pro",
    hasData: (m) => m.sampleSize >= 25,
    emptyReason: "",
  },
  {
    id: "period_comparison",
    title: "Period comparison",
    requiredPlan: "pro",
    hasData: (m) => m.comparisons.views.previous > 0 || m.comparisons.views.current > 0,
    emptyReason: "No comparable history yet",
  },
  {
    id: "traffic_sources",
    title: "Traffic sources",
    requiredPlan: "pro",
    hasData: (m) => m.sources.length > 0,
    emptyReason: "No traffic sources detected",
  },
  {
    id: "devices",
    title: "Devices",
    requiredPlan: "pro",
    hasData: (m) => m.devices.length > 0,
    emptyReason: "No device information captured",
  },
  {
    id: "new_vs_returning",
    title: "New vs returning",
    requiredPlan: "business",
    hasData: (m) => m.totals.visitors > 0,
    emptyReason: "No visitors yet",
  },
  {
    id: "conversion_funnel",
    title: "Conversion funnel",
    requiredPlan: "business",
    hasData: (m) => m.sampleSize >= 25 && m.funnel.some((step) => step.value > 0),
    emptyReason: "No funnel activity yet",
  },
  {
    id: "geography",
    title: "Geography",
    requiredPlan: "business",
    hasData: (m) => m.countries.length > 0 || m.cities.length > 0,
    emptyReason: "No location signals captured",
  },
  {
    id: "anomalies_momentum",
    title: "Momentum & anomalies",
    requiredPlan: "business",
    hasData: (m) => m.sampleSize > 0,
    emptyReason: "No activity to analyse",
  },
];

export function planRank(plan: PlanId): number {
  return PLAN_ORDER.indexOf(plan);
}

export function resolveWidgets(metrics: AnalyticsMetricsV1, plan: PlanId): WidgetDecisionV1[] {
  return SPECS.map((spec) => {
    if (!spec.hasData(metrics)) {
      return {
        id: spec.id,
        title: spec.title,
        visibility: "hidden" as const,
        reason: spec.emptyReason,
        requiredPlan: spec.requiredPlan,
      };
    }
    if (planRank(plan) < planRank(spec.requiredPlan)) {
      return {
        id: spec.id,
        title: spec.title,
        visibility: "locked" as const,
        reason: `Available on ${spec.requiredPlan.charAt(0).toUpperCase()}${spec.requiredPlan.slice(1)}`,
        requiredPlan: spec.requiredPlan,
      };
    }
    return {
      id: spec.id,
      title: spec.title,
      visibility: "visible" as const,
      reason: "",
      requiredPlan: spec.requiredPlan,
    };
  });
}

export function widgetMap(decisions: WidgetDecisionV1[]): Record<WidgetId, WidgetDecisionV1> {
  const map = {} as Record<WidgetId, WidgetDecisionV1>;
  for (const decision of decisions) map[decision.id] = decision;
  return map;
}
