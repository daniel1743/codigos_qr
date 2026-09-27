/**
 * CRIPQER INTELLIGENT ANALYTICS V1 — Smart Goals.
 *
 * Deterministic goal derivation from real history. Never invents a target
 * out of thin air: with too little history it stays in "learning".
 */

import { LEARNING_THRESHOLD } from "./intelligence-engine";
import { GOAL_NOUN } from "./copy.es-419";
import type { AnalyticsMetricsV1, GoalStatus, SmartGoalV1 } from "./analytics.types";
import { zonedParts, zonedDateTimeToUtc } from "./timezone";

function daysLeftInMonth(now: Date, timezone: string): number {
  const parts = zonedParts(now.getTime(), timezone);
  const end = zonedDateTimeToUtc({ year: parts.month === 12 ? parts.year + 1 : parts.year, month: parts.month === 12 ? 1 : parts.month + 1, day: 1, hour: 0, minute: 0, second: 0 }, timezone);
  return Math.max(Math.ceil((end - now.getTime()) / 86_400_000), 1);
}

function statusOf(progress: number, projected: number, target: number): GoalStatus {
  if (progress >= 1) return "achieved";
  if (projected >= target) return "on_track";
  if (projected >= target * 0.75) return "at_risk";
  return "behind";
}

function buildGoal(
  id: SmartGoalV1["id"],
  metric: SmartGoalV1["metric"],
  label: string,
  current: number,
  baselinePerDay: number,
  now: Date,
  timezone: string,
): SmartGoalV1 {
  const daysRemaining = daysLeftInMonth(now, timezone);
  const elapsed = Math.max(zonedParts(now.getTime(), timezone).day, 1);
  const monthDays = elapsed + daysRemaining;
  // Target = stretch of 15% over the observed baseline pace, rounded to a
  // friendly number. Derived from real data only.
  const rawTarget = baselinePerDay * monthDays * 1.15;
  const target = Math.max(Math.ceil(rawTarget / 5) * 5, Math.ceil(current * 1.05), 5);
  const perDaySoFar = current / elapsed;
  const projected = Math.round(current + perDaySoFar * daysRemaining);
  const progress = target > 0 ? Math.min(current / target, 1) : 0;
  const requiredPerDay = Math.max(Math.ceil((target - current) / daysRemaining), 0);
  const status = statusOf(progress, projected, target);

  const noun = GOAL_NOUN[metric];
  const message =
    status === "achieved"
      ? `Meta cumplida: ${current} de ${target} ${noun} este mes.`
      : status === "on_track"
        ? `La proyección es ${projected} ${noun} y tu meta es ${target}.`
        : status === "at_risk"
          ? `La proyección es ${projected} ${noun} y tu meta es ${target}. Con alrededor de ${requiredPerDay} por día llegas.`
          : `Vas por debajo de tu meta: necesitas alrededor de ${requiredPerDay} por día durante los ${daysRemaining} días que quedan.`;

  return {
    id,
    metric,
    label,
    status,
    target,
    current,
    progress,
    daysRemaining,
    requiredPerDay,
    projected,
    message,
  };
}

export function generateSmartGoals(metrics: AnalyticsMetricsV1, now: Date, timezone: string): SmartGoalV1[] {
  if (metrics.sampleSize < LEARNING_THRESHOLD) {
    return [
      {
        id: "learning",
        metric: "views",
        label: "Visitas del mes",
        status: "learning",
        target: 0,
        current: metrics.totals.views,
        progress: 0,
        daysRemaining: daysLeftInMonth(now, timezone),
        requiredPerDay: 0,
        projected: 0,
        message:
          "Cripqer calcula tus metas a partir de tu propia historia. Con unos días más de actividad aparecerán aquí.",
      },
    ];
  }

  const elapsed = Math.max(zonedParts(now.getTime(), timezone).day, 1);
  const baselineViews = Math.max(metrics.monthToDate.views / elapsed, 1);
  const baselineInteractions = metrics.monthToDate.interactions / elapsed;

  const goals: SmartGoalV1[] = [
    buildGoal("views", "views", "Visitas del mes", metrics.monthToDate.views, baselineViews, now, timezone),
    buildGoal(
      "interactions",
      "interactions",
      "Acciones del mes",
      metrics.monthToDate.interactions,
      Math.max(baselineInteractions, 0.5),
      now,
      timezone,
    ),
  ];

  if (metrics.monthToDate.leads > 0) {
    goals.push(
      buildGoal(
        "leads",
        "leads",
        "Contactos del mes",
        metrics.monthToDate.leads,
        Math.max(metrics.monthToDate.leads / elapsed, 0.2),
        now,
        timezone,
      ),
    );
  }

  return goals;
}
