/**
 * CRIPQER INTELLIGENT ANALYTICS V1 — Daily Brief.
 *
 * Deterministic natural-language summary. Template-driven, never generative.
 */

import { LEARNING_THRESHOLD } from "./intelligence-engine";
import { METRIC_COPY, decimalEs } from "./copy.es-419";
import type {
  AnalyticsInsightV1,
  AnalyticsMetricsV1,
  DailyBriefV1,
  SmartGoalV1,
} from "./analytics.types";

function pctLabel(value: number | null): string {
  if (value === null) return "todavía no tienen con qué compararse";
  const rounded = Math.round(value);
  if (rounded === 0) return "se mantienen igual";
  return rounded > 0 ? `aumentaron ${Math.abs(rounded)}%` : `bajaron ${Math.abs(rounded)}%`;
}

export function buildDailyBrief(
  metrics: AnalyticsMetricsV1,
  insights: AnalyticsInsightV1[],
  goals: SmartGoalV1[],
  now: Date,
): DailyBriefV1 {
  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  if (metrics.sampleSize < LEARNING_THRESHOLD) {
    return {
      id: `brief_${now.toISOString().slice(0, 10)}`,
      dateLabel,
      state: "learning",
      headline: "Estamos empezando a conocer a tus visitantes",
      paragraphs: [
        `Ya registramos ${metrics.totals.views} visitas y ${metrics.totals.interactions} acciones en tu página. Todavía no alcanza para describir un patrón con confianza.`,
        "Sigue compartiendo el enlace de tu página o tu QR donde ya están tus clientes. Cuando haya más actividad, este resumen se convertirá en una lectura diaria de tu negocio.",
      ],
      bullets: [
        {
          label: `${METRIC_COPY.views.primary} ${METRIC_COPY.views.technical}`,
          value: String(metrics.totals.views),
        },
        {
          label: `${METRIC_COPY.interactions.primary} ${METRIC_COPY.interactions.technical}`,
          value: String(metrics.totals.interactions),
        },
      ],
    };
  }

  const leader = metrics.channels[0];
  const topLink = metrics.topLinks[0];
  const headlineInsight = insights[0];

  const headline =
    headlineInsight?.title ??
    (metrics.momentum === "declining" ? "Un período más tranquilo" : "Actividad estable");

  const paragraphs: string[] = [];
  paragraphs.push(
    `En tu página registramos ${metrics.totals.views} visitas y ${metrics.totals.interactions} acciones. Frente al período anterior, tus visitas ${pctLabel(metrics.comparisons.views.deltaPct)}. Son ${decimalEs(metrics.interactionRate)} acciones por visita (interacciones por visita), y en ${Math.round(metrics.actionRate * 100)}% de las visitas la persona hizo algo.`,
  );

  if (leader && leader.clicks > 0) {
    paragraphs.push(
      `${leader.label} es tu canal con más acciones: ${leader.clicks} (${Math.round(leader.share * 100)}% del total)${
        topLink ? `, y "${topLink.label}" es el enlace que más interesó` : ""
      }.`,
    );
  }

  if (metrics.bestHour) {
    paragraphs.push(
      `La mayor parte de la actividad se concentra alrededor de las ${String(metrics.bestHour.hour).padStart(2, "0")}:00, un buen momento para publicar o enviar tu página.`,
    );
  }

  const goal = goals.find((item) => item.status !== "learning");
  if (goal) paragraphs.push(goal.message);

  return {
    id: `brief_${now.toISOString().slice(0, 10)}`,
    dateLabel,
    state: "ready",
    headline,
    paragraphs,
    bullets: [
      { label: `${METRIC_COPY.views.primary} ${METRIC_COPY.views.technical}`, value: String(metrics.totals.views) },
      {
        label: `${METRIC_COPY.interactions.primary} ${METRIC_COPY.interactions.technical}`,
        value: String(metrics.totals.interactions),
      },
      {
        label: `${METRIC_COPY.interactionsPerView.primary} ${METRIC_COPY.interactionsPerView.technical}`,
        value: `${decimalEs(metrics.interactionRate)}\u00d7`,
      },
      {
        label: `${METRIC_COPY.qrScans.primary} ${METRIC_COPY.qrScans.technical}`,
        value: String(metrics.totals.qrScans),
      },
    ],
  };
}
