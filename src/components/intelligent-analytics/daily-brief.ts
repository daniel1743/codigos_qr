/**
 * CRIPQER INTELLIGENT ANALYTICS V1 — Daily Brief.
 *
 * Deterministic natural-language summary. Template-driven, never generative.
 */

import { LEARNING_THRESHOLD } from "./intelligence-engine";
import type {
  AnalyticsInsightV1,
  AnalyticsMetricsV1,
  DailyBriefV1,
  SmartGoalV1,
} from "./analytics.types";

function pctLabel(value: number | null): string {
  if (value === null) return "new activity";
  const rounded = Math.round(value);
  if (rounded === 0) return "flat";
  return `${rounded > 0 ? "up" : "down"} ${Math.abs(rounded)}%`;
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
      headline: "Collecting your first signals",
      paragraphs: [
        `So far this period recorded ${metrics.sampleSize} signals and ${metrics.totals.views} views. That is not enough for Cripqer to describe a pattern honestly.`,
        "Share your page link or QR code in the places your customers already are. As soon as there is enough activity, this brief turns into a real daily read of your performance.",
      ],
      bullets: [
        { label: "Views", value: String(metrics.totals.views) },
        { label: "Interactions", value: String(metrics.totals.interactions) },
      ],
    };
  }

  const leader = metrics.channels[0];
  const topLink = metrics.topLinks[0];
  const headlineInsight = insights[0];

  const headline =
    headlineInsight?.title ??
    (metrics.momentum === "declining" ? "A quieter period" : "Steady performance");

  const paragraphs: string[] = [];
  paragraphs.push(
    `Your page received ${metrics.totals.views} views and ${metrics.totals.interactions} interactions, ${pctLabel(metrics.comparisons.views.deltaPct)} against the previous period. That is ${metrics.interactionRate.toFixed(2)} interactions per view; ${Math.round(metrics.actionRate * 100)}% of sessions with a view took an action.`,
  );

  if (leader && leader.clicks > 0) {
    paragraphs.push(
      `${leader.label} is your strongest channel with ${leader.clicks} clicks (${Math.round(leader.share * 100)}% of all clicks)${
        topLink ? `, and "${topLink.label}" is the single most used link` : ""
      }.`,
    );
  }

  if (metrics.bestHour) {
    paragraphs.push(
      `Most of the activity concentrates around ${String(metrics.bestHour.hour).padStart(2, "0")}:00, which is the best moment to post or send your page.`,
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
      { label: "Views", value: String(metrics.totals.views) },
      { label: "Interactions", value: String(metrics.totals.interactions) },
      { label: "Interactions/view", value: `${metrics.interactionRate.toFixed(2)}×` },
      { label: "QR scans", value: String(metrics.totals.qrScans) },
    ],
  };
}
