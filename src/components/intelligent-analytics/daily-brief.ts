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

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/**
 * Primera frase del resumen. Se adapta a crecimiento, caída, igualdad, ausencia
 * de período anterior y cero visitas. Nunca equipara eventos con personas ni
 * con sesiones, y no usa `actionRate` (métrica de sesiones).
 */
function viewsSentence(views: number, deltaPct: number | null): string {
  if (views === 0) return "En este período no registramos visitas en tu página.";
  const visitas = plural(views, "visita", "visitas");
  if (deltaPct === null) {
    return `Tu página registró ${visitas} este período: todavía no hay un período anterior con el que comparar.`;
  }
  const rounded = Math.round(deltaPct);
  if (rounded === 0) return `Tu página se mantuvo igual: ${visitas}, como en el período anterior.`;
  if (rounded > 0) {
    return `Tu página sigue creciendo: ${visitas}, un ${rounded}% más que en el período anterior.`;
  }
  return `Tu página recibió menos visitas: ${visitas}, un ${Math.abs(rounded)}% menos que en el período anterior.`;
}

/** Segunda frase: acciones y contactos, cada uno con su unidad real. */
function activitySentence(interactions: number, leads: number): string {
  const acciones = plural(interactions, "acción", "acciones");
  const contactos = plural(leads, "contacto", "contactos");
  if (interactions === 0 && leads === 0) return "No se registraron acciones ni contactos.";
  if (interactions === 0) return `No se registraron acciones, pero sí ${contactos}.`;
  if (leads === 0) return `Se registraron ${acciones} y ningún contacto.`;
  return `Se registraron ${acciones} y ${contactos}.`;
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
        { label: METRIC_COPY.views.primary, value: String(metrics.totals.views) },
        { label: METRIC_COPY.interactions.primary, value: String(metrics.totals.interactions) },
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
    `${viewsSentence(metrics.totals.views, metrics.comparisons.views.deltaPct)} ${activitySentence(metrics.totals.interactions, metrics.totals.leads)}`,
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
      { label: METRIC_COPY.views.primary, value: String(metrics.totals.views) },
      { label: METRIC_COPY.interactions.primary, value: String(metrics.totals.interactions) },
      {
        label: METRIC_COPY.interactionsPerView.primary,
        value: `${decimalEs(metrics.interactionRate)}\u00d7`,
      },
      { label: METRIC_COPY.qrScans.primary, value: String(metrics.totals.qrScans) },
    ],
  };
}
