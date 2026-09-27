/**
 * CRIPQER INTELLIGENT ANALYTICS V1 — Adaptive Widget Registry.
 *
 * Decides which widgets exist for a given plan and data reality.
 * A widget with no meaningful data is hidden, never rendered empty.
 * A widget above the plan is LOCKED (visible teaser), never fake data.
 */

import { PLAN_ORDER, type AnalyticsMetricsV1, type PlanId, type WidgetDecisionV1, type WidgetId } from "./analytics.types";
import { planLockReason } from "./copy.es-419";

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
    title: "Actividad reciente",
    requiredPlan: "free",
    hasData: (m) => m.recentEvents.length > 0,
    emptyReason: "Todavía no hay actividad registrada",
  },
  {
    id: "performance_overview",
    title: "Resumen de tu actividad",
    requiredPlan: "free",
    hasData: () => true,
    emptyReason: "",
  },
  {
    id: "performance_trend",
    title: "Cómo evolucionaron tus visitas",
    requiredPlan: "free",
    hasData: (m) => m.series.views.some((point) => point.value > 0),
    emptyReason: "No hubo visitas en este período",
  },
  {
    id: "intelligence",
    title: "Lo que Cripqer detectó",
    requiredPlan: "free",
    hasData: () => true,
    emptyReason: "",
  },
  {
    id: "channel_performance",
    title: "Qué canales están funcionando",
    requiredPlan: "free",
    hasData: (m) => m.channels.length > 0,
    emptyReason: "Todavía no hay acciones en tus enlaces",
  },
  {
    id: "top_links",
    title: "Enlaces que más interesaron",
    requiredPlan: "free",
    hasData: (m) => m.topLinks.length > 0,
    emptyReason: "Todavía no hay acciones registradas",
  },
  {
    id: "hot_hours",
    title: "Horas con más actividad",
    requiredPlan: "pro",
    hasData: (m) => m.hourly.some((cell) => cell.value > 0),
    emptyReason: "Todavía no hay suficiente actividad para mostrar horarios",
  },
  {
    id: "smart_goals",
    title: "Tus metas",
    requiredPlan: "pro",
    hasData: (m) => m.sampleSize >= 25,
    emptyReason: "",
  },
  {
    id: "period_comparison",
    title: "Cómo vas comparado con el período anterior",
    requiredPlan: "pro",
    hasData: (m) => m.comparisons.views.previous > 0 || m.comparisons.views.current > 0,
    emptyReason: "Todavía no hay un período anterior para comparar",
  },
  {
    id: "traffic_sources",
    title: "De dónde llegaron tus visitas",
    requiredPlan: "pro",
    hasData: (m) => m.sources.length > 0,
    emptyReason: "Todavía no podemos saber de dónde llegaron",
  },
  {
    id: "devices",
    title: "Dispositivos utilizados",
    requiredPlan: "pro",
    hasData: (m) => m.devices.length > 0,
    emptyReason: "Todavía no registramos el tipo de dispositivo",
  },
  {
    id: "new_vs_returning",
    title: "Visitas nuevas y visitas que vuelven",
    requiredPlan: "business",
    hasData: (m) => m.totals.visitors > 0,
    emptyReason: "Todavía no hay visitas registradas",
  },
  {
    id: "conversion_funnel",
    title: "Qué hicieron después de entrar",
    requiredPlan: "business",
    hasData: (m) => m.sampleSize >= 25 && m.funnel.some((step) => step.value > 0),
    emptyReason: "Todavía no hay suficiente actividad para ver este recorrido",
  },
  {
    id: "geography",
    title: "Desde dónde te visitan",
    requiredPlan: "business",
    hasData: (m) => m.countries.length > 0 || m.cities.length > 0,
    emptyReason: "Todavía no hay señales de ubicación",
  },
  {
    id: "anomalies_momentum",
    title: "Cambios fuera de lo normal",
    requiredPlan: "business",
    hasData: (m) => m.sampleSize > 0,
    emptyReason: "Todavía no hay actividad para analizar",
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
        reason: planLockReason(spec.requiredPlan),
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
