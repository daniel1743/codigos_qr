/**
 * CRIPQER INTELLIGENT ANALYTICS V1 — Notification Intelligence.
 *
 * Scores insights, throttles by type and never spams. Emits CANDIDATES only:
 * delivery (push, email, in-app store) is the host's responsibility.
 */

import type {
  AnalyticsInsightV1,
  AnalyticsMetricsV1,
  InsightSeverity,
  NotificationCandidateV1,
  NotificationKind,
  NotificationStateV1,
} from "./analytics.types";

const HOUR_MS = 3_600_000;

/** Minimum hours between two notifications of the same type. */
const COOLDOWN_HOURS: Record<string, number> = {
  realtime_channel_spike: 6,
  realtime_surge: 8,
  traffic_spike: 12,
  traffic_drop: 24,
  channel_spike: 24,
  dominant_channel: 72,
  ctr_improvement: 24,
  ctr_drop: 24,
  new_daily_record: 20,
  near_daily_record: 24,
  new_weekly_record: 72,
  best_hour: 96,
  hot_time_window: 48,
  conversion_improvement: 24,
  conversion_deterioration: 24,
  top_link_emerging: 48,
  underperforming_link: 120,
  goal_progress: 48,
  goal_projected_success: 72,
  goal_at_risk: 48,
  low_data_learning: 168,
};

const DEFAULT_COOLDOWN_HOURS = 24;

/** Hard cap so the system stays calm even on a very active account. */
export const MAX_NOTIFICATIONS_PER_DAY = 3;

const SEVERITY_SCORE: Record<InsightSeverity, number> = {
  critical: 40,
  important: 32,
  notable: 22,
  info: 12,
};

const KIND_BY_CATEGORY: Record<AnalyticsInsightV1["category"], NotificationKind> = {
  positive: "positive",
  opportunity: "opportunity",
  warning: "warning",
  record: "record",
  trend: "opportunity",
  realtime: "live",
  goal: "goal",
  learning: "live",
};

const ICON_BY_KIND: Record<NotificationKind, string> = {
  goal: "target",
  positive: "trending-up",
  opportunity: "lightbulb",
  warning: "alert-triangle",
  record: "trophy",
  live: "activity",
};

export interface ScoreNotificationsInput {
  insights: AnalyticsInsightV1[];
  metrics: AnalyticsMetricsV1;
  state: NotificationStateV1;
  now: Date;
  /** Below this score nothing is delivered. */
  minScore?: number;
}

export interface ScoreNotificationsResult {
  candidates: NotificationCandidateV1[];
  suppressed: Array<{ type: string; reason: string }>;
  nextState: NotificationStateV1;
}

export function scoreNotifications(input: ScoreNotificationsInput): ScoreNotificationsResult {
  const { insights, metrics, state, now } = input;
  const minScore = input.minScore ?? 45;
  const suppressed: ScoreNotificationsResult["suppressed"] = [];
  const scored: NotificationCandidateV1[] = [];

  for (const insight of insights) {
    if (insight.category === "learning") {
      suppressed.push({ type: insight.type, reason: "learning_mode" });
      continue;
    }

    const cooldown = (COOLDOWN_HOURS[insight.type] ?? DEFAULT_COOLDOWN_HOURS) * HOUR_MS;
    const last = state.lastSentAt[insight.type];
    const lastMs = last ? Date.parse(last) : NaN;
    if (Number.isFinite(lastMs) && now.getTime() - lastMs < cooldown) {
      suppressed.push({ type: insight.type, reason: "cooldown" });
      continue;
    }

    const importance = SEVERITY_SCORE[insight.severity];
    const anomaly = anomalyScore(insight, metrics);
    const confidence = Math.round(insight.confidence * 20);
    const relevance = relevanceScore(insight, metrics);
    const novelty = Number.isFinite(lastMs) ? 4 : 10;
    const score = Math.min(importance + anomaly + confidence + relevance + novelty, 100);

    if (score < minScore) {
      suppressed.push({ type: insight.type, reason: "below_min_score" });
      continue;
    }

    const kind = KIND_BY_CATEGORY[insight.category];
    scored.push({
      id: `notif_${insight.type}_${now.getTime()}`,
      type: insight.type,
      kind,
      icon: ICON_BY_KIND[kind],
      title: insight.title,
      message: insight.message,
      severity: insight.severity,
      score,
      scoreParts: { importance, anomaly, confidence, relevance, novelty },
      createdAt: now.toISOString(),
      ...(insight.action ? { action: insight.action } : {}),
      ...(insight.channel ? { channel: insight.channel } : {}),
      ...(insight.metrics[0] ? { metric: insight.metrics[0] } : {}),
    });
  }

  scored.sort((a, b) => b.score - a.score);

  // Rolling 24h cap across every delivery the host already made.
  const dayAgo = now.getTime() - 24 * HOUR_MS;
  const priorDeliveries = (state.recentDeliveries ?? []).filter((iso) => {
    const time = Date.parse(iso);
    return Number.isFinite(time) && time >= dayAgo;
  });
  const slots = Math.max(MAX_NOTIFICATIONS_PER_DAY - priorDeliveries.length, 0);

  const candidates = scored.slice(0, slots);
  for (const extra of scored.slice(slots)) {
    suppressed.push({ type: extra.type, reason: "daily_cap" });
  }

  const lastSentAt = { ...state.lastSentAt };
  for (const candidate of candidates) lastSentAt[candidate.type] = candidate.createdAt;

  return {
    candidates,
    suppressed,
    nextState: {
      lastSentAt,
      recentDeliveries: [...priorDeliveries, ...candidates.map((c) => c.createdAt)],
    },
  };
}

function anomalyScore(insight: AnalyticsInsightV1, metrics: AnalyticsMetricsV1): number {
  const delta = metrics.comparisons.views.deltaPct ?? 0;
  const base = Math.min(Math.abs(delta) / 5, 15);
  if (insight.category === "realtime") return Math.max(base, 18);
  if (insight.category === "record") return Math.max(base, 12);
  if (insight.category === "goal") return Math.max(base, 10);
  if (metrics.momentum === "unusual_activity") return Math.max(base, 14);
  return base;
}

function relevanceScore(insight: AnalyticsInsightV1, metrics: AnalyticsMetricsV1): number {
  let score = 0;
  if (insight.channel && metrics.activeChannels.includes(insight.channel)) score += 8;
  if (insight.action && insight.action.type !== "none") score += 5;
  if (metrics.sampleSize >= 200) score += 4;
  return score;
}

export const EMPTY_NOTIFICATION_STATE: NotificationStateV1 = { lastSentAt: {} };
