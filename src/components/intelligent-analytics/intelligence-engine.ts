/**
 * CRIPQER INTELLIGENT ANALYTICS V1 — Intelligence Engine.
 *
 * Deterministic, rule-based interpretation of AnalyticsMetricsV1.
 * No AI, no network. Same metrics in => same insights out.
 */

import {
  type AnalyticsInsightV1,
  type RollingWindowAnalyticsV1,
  type SmartGoalV1,
  type AnalyticsMetricsV1,
  type InsightCategory,
  type InsightSeverity,
  type InsightType,
  type RecommendedActionV1,
} from "./analytics.types";

/** Below this many events we only speak in "learning" language. */
export const LEARNING_THRESHOLD = 25;
/** Below this we never claim a trend. */
export const TREND_THRESHOLD = 60;

function confidenceFor(sampleSize: number, effect: number): number {
  const sample = Math.min(sampleSize / 200, 1);
  const strength = Math.min(Math.abs(effect) / 100, 1);
  return Math.round(Math.min(0.35 + sample * 0.45 + strength * 0.2, 0.98) * 100) / 100;
}

function fmtPct(value: number | null): string {
  if (value === null) return "new";
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

function fmtRate(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function hourWindow(hour: number): string {
  const end = (hour + 1) % 24;
  return `${String(hour).padStart(2, "0")}:00–${String(end).padStart(2, "0")}:00`;
}

interface Draft {
  type: InsightType;
  category: InsightCategory;
  title: string;
  message: string;
  severity: InsightSeverity;
  confidence: number;
  metrics: Array<{ label: string; value: string }>;
  channel?: AnalyticsInsightV1["channel"] | undefined;
  action?: RecommendedActionV1 | undefined;
}

export interface GenerateInsightsOptionsV1 {
  /** Rolling realtime analytics, when the host supplies recent events. */
  rolling?: RollingWindowAnalyticsV1 | undefined;
  /** Smart goals already derived for this period. */
  goals?: SmartGoalV1[] | undefined;
}

export function generateInsights(
  metrics: AnalyticsMetricsV1,
  options: GenerateInsightsOptionsV1 = {},
): AnalyticsInsightV1[] {
  const drafts: Draft[] = [];
  const { sampleSize } = metrics;

  if (sampleSize < LEARNING_THRESHOLD) {
    drafts.push({
      type: "low_data_learning",
      category: "learning",
      title: "Still learning your audience",
      message:
        sampleSize === 0
          ? "No activity recorded in this period yet. Share your page or QR code to start collecting signals."
          : `Only ${sampleSize} signals so far. Cripqer needs a bit more activity before it can call trends with confidence.`,
      severity: "info",
      confidence: 0.4,
      metrics: [{ label: "Signals", value: String(sampleSize) }],
      action: { type: "none", label: "Keep sharing your page" },
    });
    return finalize(drafts);
  }

  /* Traffic movement -------------------------------------------------- */
  const viewDelta = metrics.comparisons.views.deltaPct;
  if (sampleSize >= TREND_THRESHOLD && viewDelta !== null) {
    if (viewDelta >= 25) {
      drafts.push({
        type: "traffic_spike",
        category: "positive",
        title: "Your traffic is climbing",
        message: `Views are up ${fmtPct(viewDelta)} versus the previous period (${metrics.comparisons.views.current} vs ${metrics.comparisons.views.previous}).`,
        severity: viewDelta >= 60 ? "important" : "notable",
        confidence: confidenceFor(sampleSize, viewDelta),
        metrics: [
          { label: "Views", value: String(metrics.totals.views) },
          { label: "Change", value: fmtPct(viewDelta) },
        ],
        action: { type: "open_analytics", label: "See what changed" },
      });
    } else if (viewDelta <= -25) {
      drafts.push({
        type: "traffic_drop",
        category: "warning",
        title: "Traffic slowed down",
        message: `Views dropped ${fmtPct(viewDelta)} compared with the previous period. Consider resharing your page or QR code.`,
        severity: viewDelta <= -50 ? "important" : "notable",
        confidence: confidenceFor(sampleSize, viewDelta),
        metrics: [
          { label: "Views", value: String(metrics.totals.views) },
          { label: "Change", value: fmtPct(viewDelta) },
        ],
        action: { type: "open_editor", label: "Refresh your page", target: "page" },
      });
    }
  }

  /* Channels ---------------------------------------------------------- */
  const leader = metrics.channels[0];
  if (leader && leader.clicks > 0) {
    if (leader.share >= 0.55 && metrics.channels.length > 1) {
      drafts.push({
        type: "dominant_channel",
        category: "trend",
        title: `${leader.label} is doing the heavy lifting`,
        message: `${Math.round(leader.share * 100)}% of all channel clicks go to ${leader.label}. Give it the most visible position on your page.`,
        severity: "notable",
        confidence: confidenceFor(sampleSize, leader.share * 100),
        metrics: [
          { label: "Clicks", value: String(leader.clicks) },
          { label: "Share", value: `${Math.round(leader.share * 100)}%` },
        ],
        channel: leader.channel,
        action: { type: "open_editor", label: `Promote ${leader.label}`, target: "channel", targetId: leader.channel },
      });
    }
    for (const channel of metrics.channels) {
      if (channel.deltaPct !== null && channel.deltaPct >= 60 && channel.clicks >= 8) {
        drafts.push({
          type: "channel_spike",
          category: "positive",
          title: `${channel.label} is heating up`,
          message: `${channel.label} clicks grew ${fmtPct(channel.deltaPct)} this period (${channel.clicks} clicks).`,
          severity: "notable",
          confidence: confidenceFor(sampleSize, channel.deltaPct),
          metrics: [
            { label: channel.label, value: String(channel.clicks) },
            { label: "Change", value: fmtPct(channel.deltaPct) },
          ],
          channel: channel.channel,
        });
      }
    }
  }

  /* CTR ---------------------------------------------------------------- */
  const ctrDelta = metrics.comparisons.ctr.deltaPct;
  if (sampleSize >= TREND_THRESHOLD && ctrDelta !== null && Math.abs(ctrDelta) >= 20) {
    const improving = ctrDelta > 0;
    drafts.push({
      type: improving ? "ctr_improvement" : "ctr_drop",
      category: improving ? "positive" : "opportunity",
      title: improving ? "Engagement is rising" : "Fewer interactions per view",
      message: improving
        ? `Interactions per view rose to ${metrics.interactionRate.toFixed(2)} (${fmtPct(ctrDelta)}). Whatever changed, keep it.`
        : `Interactions per view fell to ${metrics.interactionRate.toFixed(2)} (${fmtPct(ctrDelta)}). A clearer main button usually recovers this.`,
      severity: improving ? "notable" : "important",
      confidence: confidenceFor(sampleSize, ctrDelta),
      metrics: [
        { label: "Interactions/view", value: `${metrics.interactionRate.toFixed(2)}×` },
        { label: "Change", value: fmtPct(ctrDelta) },
      ],
      action: improving
        ? { type: "open_analytics", label: "See engagement detail" }
        : { type: "open_editor", label: "Improve your main button", target: "cta" },
    });
  }

  /* Conversion ---------------------------------------------------------- */
  const conversionDelta = metrics.comparisons.conversion.deltaPct;
  if (metrics.totals.leads > 0 && conversionDelta !== null && Math.abs(conversionDelta) >= 25) {
    const improving = conversionDelta > 0;
    drafts.push({
      type: improving ? "conversion_improvement" : "conversion_deterioration",
      category: improving ? "positive" : "warning",
      title: improving ? "More views are converting" : "Conversion is slipping",
      message: `${fmtRate(metrics.conversionRate)} of views now convert (${fmtPct(conversionDelta)}).`,
      severity: improving ? "notable" : "important",
      confidence: confidenceFor(sampleSize, conversionDelta),
      metrics: [
        { label: "Conversion", value: fmtRate(metrics.conversionRate) },
        { label: "Leads", value: String(metrics.totals.leads) },
      ],
    });
  }

  /* Records --------------------------------------------------------------- */
  const { records } = metrics;
  if (records.todayValue > 0 && records.todayValue >= records.bestDayValue) {
    drafts.push({
      type: "new_daily_record",
      category: "record",
      title: "New daily record",
      message: `Today is your strongest day so far with ${records.todayValue} views.`,
      severity: "important",
      confidence: 0.9,
      metrics: [{ label: "Views today", value: String(records.todayValue) }],
    });
  } else if (records.bestDayValue > 0 && records.todayValue >= records.bestDayValue * 0.8) {
    drafts.push({
      type: "near_daily_record",
      category: "record",
      title: "Close to your best day",
      message: `Today is at ${records.todayValue} views — your record is ${records.bestDayValue}.`,
      severity: "notable",
      confidence: 0.75,
      metrics: [
        { label: "Today", value: String(records.todayValue) },
        { label: "Record", value: String(records.bestDayValue) },
      ],
    });
  }

  /* Timing ---------------------------------------------------------------- */
  if (metrics.bestHour && metrics.bestHour.value >= 5) {
    drafts.push({
      type: "best_hour",
      category: "opportunity",
      title: "Your audience shows up at a specific time",
      message: `${hourWindow(metrics.bestHour.hour)} is your busiest window. Publish and share around then.`,
      severity: "notable",
      confidence: confidenceFor(sampleSize, metrics.bestHour.value),
      metrics: [
        { label: "Peak window", value: hourWindow(metrics.bestHour.hour) },
        { label: "Activity", value: String(metrics.bestHour.value) },
      ],
    });
  }

  /* Links ------------------------------------------------------------------ */
  const topLink = metrics.topLinks[0];
  if (topLink && topLink.deltaPct !== null && topLink.deltaPct >= 50 && topLink.value >= 6) {
    drafts.push({
      type: "top_link_emerging",
      category: "opportunity",
      title: `"${topLink.label}" is gaining traction`,
      message: `That link grew ${fmtPct(topLink.deltaPct)} this period. Moving it higher usually compounds the gain.`,
      severity: "notable",
      confidence: confidenceFor(sampleSize, topLink.deltaPct),
      metrics: [
        { label: "Clicks", value: String(topLink.value) },
        { label: "Change", value: fmtPct(topLink.deltaPct) },
      ],
      action: { type: "open_editor", label: "Move it up", target: "link", targetId: topLink.id },
    });
  }
  const weakest = metrics.topLinks[metrics.topLinks.length - 1];
  if (metrics.topLinks.length >= 4 && weakest && weakest.share < 0.03 && metrics.totals.views >= 40) {
    drafts.push({
      type: "underperforming_link",
      category: "opportunity",
      title: `"${weakest.label}" barely gets clicks`,
      message: `It takes up space but captures ${Math.round(weakest.share * 100)}% of clicks. Consider rewording or removing it.`,
      severity: "info",
      confidence: confidenceFor(sampleSize, 20),
      metrics: [{ label: "Clicks", value: String(weakest.value) }],
      action: { type: "open_editor", label: "Review this link", target: "link", targetId: weakest.id },
    });
  }


  /* Realtime rolling windows (V1.1) ---------------------------------- */
  const rolling = options.rolling;
  if (rolling && rolling.sampleSufficient) {
    const spike = rolling.spikes[0];
    if (spike) {
      drafts.push({
        type: "realtime_channel_spike",
        category: "realtime",
        title: `${spike.label} is heating up right now`,
        message: `${spike.clicks} clicks were recorded on your ${spike.label} link from Cripqer during the last ${spike.windowMinutes} minutes. That is ${spike.ratio.toFixed(1)}\u00d7 your usual activity.`,
        severity: spike.ratio >= 3 ? "important" : "notable",
        confidence: spike.confidence,
        metrics: [
          { label: "Clicks", value: String(spike.clicks) },
          { label: "Versus usual", value: `${spike.ratio.toFixed(1)}\u00d7` },
          { label: "Window", value: `${spike.windowMinutes} min` },
        ],
        channel: spike.channel,
        action: { type: "open_analytics", label: "View activity" },
      });
    }
    const hour = rolling.windows.find((entry) => entry.windowMinutes === 60);
    if (!spike && hour && hour.ratio !== null && hour.ratio >= 2 && hour.total >= 10) {
      drafts.push({
        type: "realtime_surge",
        category: "realtime",
        title: "More activity than usual is on your page",
        message: `${hour.total} signals in the last hour, ${hour.ratio.toFixed(1)}\u00d7 your usual pace for this window.`,
        severity: "notable",
        confidence: 0.72,
        metrics: [
          { label: "Last hour", value: String(hour.total) },
          { label: "Versus usual", value: `${hour.ratio.toFixed(1)}\u00d7` },
        ],
        action: { type: "open_analytics", label: "View activity" },
      });
    }
  }

  /* Weekly record ----------------------------------------------------- */
  const thisWeek = records.thisWeekValue ?? 0;
  if (thisWeek > 0 && records.bestWeekValue > 0 && thisWeek >= records.bestWeekValue) {
    drafts.push({
      type: "new_weekly_record",
      category: "record",
      title: "Best week so far",
      message: `This week already reached ${thisWeek} views \u2014 your strongest week on record.`,
      severity: "important",
      confidence: 0.88,
      metrics: [
        { label: "This week", value: String(thisWeek) },
        { label: "Previous best", value: String(records.bestWeekValue) },
      ],
      action: { type: "open_analytics", label: "View performance" },
    });
  }

  /* Hot time window --------------------------------------------------- */
  if (metrics.bestHour && metrics.bestHour.value >= 8 && metrics.totals.views > 0) {
    const share = metrics.bestHour.value / Math.max(metrics.totals.views, 1);
    if (share >= 0.12) {
      drafts.push({
        type: "hot_time_window",
        category: "opportunity",
        title: "There is a window that works better than the rest",
        message: `${Math.round(share * 100)}% of everything happens around ${hourWindow(metrics.bestHour.hour)}. Sharing just before that window compounds it.`,
        severity: "notable",
        confidence: confidenceFor(sampleSize, share * 100),
        metrics: [
          { label: "Window", value: hourWindow(metrics.bestHour.hour) },
          { label: "Share", value: `${Math.round(share * 100)}%` },
        ],
        action: { type: "open_analytics", label: "See hot hours" },
      });
    }
  }

  /* Smart goal insights ------------------------------------------------ */
  for (const goal of options.goals ?? []) {
    if (goal.status === "learning") continue;
    const remaining = Math.max(goal.target - goal.current, 0);
    if (goal.progress >= 0.7 && goal.progress < 1) {
      drafts.push({
        type: "goal_progress",
        category: "goal",
        title: "You're close to your record",
        message: `You need ${remaining} more ${goal.label.toLowerCase().replace("monthly ", "")} to reach your ${goal.target} target.`,
        severity: "notable",
        confidence: 0.75,
        metrics: [
          { label: "Progress", value: `${Math.round(goal.progress * 100)}%` },
          { label: "Remaining", value: String(remaining) },
        ],
        action: { type: "open_analytics", label: "View performance" },
      });
    } else if (goal.status === "on_track" && goal.progress < 1) {
      drafts.push({
        type: "goal_projected_success",
        category: "goal",
        title: `You are on track for your ${goal.label.toLowerCase()} goal`,
        message: `At the current pace you land around ${goal.projected}, past your ${goal.target} target.`,
        severity: "notable",
        confidence: 0.8,
        metrics: [
          { label: "Projected", value: String(goal.projected) },
          { label: "Target", value: String(goal.target) },
        ],
        action: { type: "open_analytics", label: "View performance" },
      });
    } else if (goal.status === "at_risk" || goal.status === "behind") {
      drafts.push({
        type: "goal_at_risk",
        category: "goal",
        title: `Your ${goal.label.toLowerCase()} goal needs a push`,
        message: `${remaining} to go with ${goal.daysRemaining} days left \u2014 about ${goal.requiredPerDay} per day closes the gap.`,
        severity: goal.status === "behind" ? "important" : "notable",
        confidence: 0.78,
        metrics: [
          { label: "Remaining", value: String(remaining) },
          { label: "Per day", value: String(goal.requiredPerDay) },
        ],
        action: { type: "open_editor", label: "Improve your page", target: "page" },
      });
    }
  }

  return finalize(drafts);
}

const SEVERITY_WEIGHT: Record<InsightSeverity, number> = {
  critical: 4,
  important: 3,
  notable: 2,
  info: 1,
};

function finalize(drafts: Draft[]): AnalyticsInsightV1[] {
  const seen = new Set<InsightType>();
  return drafts
    .filter((draft) => {
      if (seen.has(draft.type)) return false;
      seen.add(draft.type);
      return true;
    })
    .map((draft, index): AnalyticsInsightV1 => {
      const { channel, action, ...rest } = draft;
      return {
        ...rest,
        id: `insight_${draft.type}_${index}`,
        ...(channel ? { channel } : {}),
        ...(action ? { action } : {}),
      };
    })
    .sort(
      (a, b) =>
        categoryWeight(b.category) - categoryWeight(a.category) ||
        SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity] ||
        b.confidence - a.confidence,
    );
}

/** Realtime always reads first: it is the only time-sensitive category. */
function categoryWeight(category: AnalyticsInsightV1["category"]): number {
  if (category === "realtime") return 2;
  if (category === "record" || category === "goal") return 1;
  return 0;
}
