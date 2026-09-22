/**
 * CRIPQER INTELLIGENT ANALYTICS V1.1 — Real-data capability gate.
 *
 * The metrics engine aggregates device/geography/source/audience/funnel as
 * *session share*. When the persisted records carry no defensible `session_id`,
 * those aggregations silently degrade to event counts, which would fabricate
 * "visitors"/"sessions" from raw events. This module lets a host declare what
 * the real persistence actually proves and force the session-dependent widgets
 * into a truthful hidden/learning state instead.
 */

import type {
  AnalyticsEventV1,
  AnalyticsMetricsV1,
  PlanId,
  WidgetDecisionV1,
  WidgetId,
} from "./analytics.types";
import { resolveWidgets } from "./widget-registry";

export interface RealDataAvailabilityV1 {
  /** Persisted records include a defensible session_id? */
  sessionTracking: boolean;
  /** Any record proves QR origin (qr_scan / qrId)? */
  qrProvenance: boolean;
  /** Persisted records include country/city signals? */
  hasGeography: boolean;
  /** Persisted records include device/browser/os signals? */
  hasDevice: boolean;
  /** Persisted records include source/utm signals (not merely referrer)? */
  hasTrafficSource: boolean;
}

/**
 * Widgets whose metrics are computed as session share and therefore MUST NOT
 * be shown when no defensible session_id exists.
 */
export const SESSION_DEPENDENT_WIDGET_IDS: readonly WidgetId[] = [
  "new_vs_returning",
  "conversion_funnel",
  "geography",
  "devices",
  "traffic_sources",
  "period_comparison",
];

/** Infer what the loaded (already mapped) events can truthfully prove. */
export function inferAvailability(events: AnalyticsEventV1[]): RealDataAvailabilityV1 {
  return {
    sessionTracking: events.some((event) => Boolean(event.sessionId)),
    qrProvenance: events.some((event) => event.eventType === "qr_scan" || Boolean(event.qrId)),
    hasGeography: events.some((event) => Boolean(event.country) || Boolean(event.cityApprox)),
    hasDevice: events.some((event) => Boolean(event.device) && event.device !== "unknown"),
    hasTrafficSource: events.some(
      (event) => Boolean(event.source) || Boolean(event.utmSource) || Boolean(event.utmCampaign),
    ),
  };
}

/**
 * Resolve widget visibility for REAL data, downgrading session-dependent
 * widgets to hidden when the persistence cannot prove sessions.
 */
export function resolveRealDataWidgets(
  metrics: AnalyticsMetricsV1,
  plan: PlanId,
  availability: RealDataAvailabilityV1,
): WidgetDecisionV1[] {
  const decisions = resolveWidgets(metrics, plan);
  if (availability.sessionTracking) return decisions;

  const forbidden = new Set<WidgetId>(SESSION_DEPENDENT_WIDGET_IDS);
  return decisions.map((decision) => {
    if (!forbidden.has(decision.id)) return decision;
    return {
      ...decision,
      visibility: "hidden",
      reason: "Requiere sesión persistida (session_id), aún no disponible en estos datos",
    };
  });
}
