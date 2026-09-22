/**
 * CRIPQER INTELLIGENT ANALYTICS V1 — portable contracts.
 *
 * Pure types. No React, no network, no storage.
 * The host (Cripqer) supplies events, plan, identity and channels.
 */

/* ------------------------------------------------------------------ */
/* Event model                                                         */
/* ------------------------------------------------------------------ */

export type AnalyticsEventType =
  | "page_view"
  | "smart_page_view"
  | "qr_scan"
  | "link_click"
  | "whatsapp_click"
  | "instagram_click"
  | "facebook_click"
  | "tiktok_click"
  | "youtube_click"
  | "linkedin_click"
  | "external_link_click"
  | "cta_click"
  | "lead_created"
  | "share"
  | "return_visit"
  | "session_start";

export type DeviceKind = "mobile" | "desktop" | "tablet" | "unknown";

export interface AnalyticsEventV1 {
  id: string;
  eventType: AnalyticsEventType;
  /** ISO 8601 timestamp. */
  timestamp: string;
  profileId: string;
  pageId?: string;
  smartPageId?: string;
  qrId?: string;
  linkId?: string;
  linkLabel?: string;
  itemId?: string;
  platform?: string;
  sessionId?: string;
  source?: string;
  referrer?: string;
  utmSource?: string;
  utmCampaign?: string;
  device?: DeviceKind;
  browser?: string;
  os?: string;
  country?: string;
  cityApprox?: string;
  metadata?: Record<string, string>;
}

/** Channels Cripqer can measure a click TO (never internal network metrics). */
export type ChannelId =
  | "whatsapp"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "youtube"
  | "linkedin"
  | "other";

export const CHANNEL_EVENT: Record<ChannelId, AnalyticsEventType> = {
  whatsapp: "whatsapp_click",
  instagram: "instagram_click",
  facebook: "facebook_click",
  tiktok: "tiktok_click",
  youtube: "youtube_click",
  linkedin: "linkedin_click",
  other: "external_link_click",
};

export const CHANNEL_LABEL: Record<ChannelId, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  other: "Other links",
};

/* ------------------------------------------------------------------ */
/* Plans & periods                                                     */
/* ------------------------------------------------------------------ */

export type PlanId = "free" | "pro" | "business" | "enterprise";

export const PLAN_ORDER: PlanId[] = ["free", "pro", "business", "enterprise"];

export type PeriodId = "today" | "7d" | "30d" | "90d" | "custom";

export interface DateRangeV1 {
  /** Inclusive ISO start. */
  from: string;
  /** Exclusive ISO end. */
  to: string;
}

/* ------------------------------------------------------------------ */
/* Metrics                                                             */
/* ------------------------------------------------------------------ */

export interface SeriesPointV1 {
  /** Bucket key (ISO day or hour label). */
  key: string;
  label: string;
  value: number;
}

export interface ChannelMetricV1 {
  channel: ChannelId;
  label: string;
  clicks: number;
  share: number;
  previousClicks: number;
  deltaPct: number | null;
  series: SeriesPointV1[];
}

export interface RankedItemV1 {
  id: string;
  label: string;
  value: number;
  previousValue: number;
  deltaPct: number | null;
  share: number;
}

export interface FunnelStepV1 {
  id: string;
  label: string;
  value: number;
  /** Conversion from the previous step, 0..1. Null on the first step. */
  stepRate: number | null;
  dropOff: number;
}

export interface HourCellV1 {
  /** 0 = Monday. */
  weekday: number;
  hour: number;
  value: number;
}

export interface RecordsV1 {
  bestDayValue: number;
  bestDayLabel: string | null;
  bestWeekValue: number;
  /** Views in the current rolling 7-day week bucket (V1.1). */
  thisWeekValue?: number;
  averageDailyValue: number;
  todayValue: number;
}

export interface ComparisonV1 {
  current: number;
  previous: number;
  deltaPct: number | null;
}

export interface AnalyticsMetricsV1 {
  version: "1";
  range: DateRangeV1;
  previousRange: DateRangeV1;
  granularity: "hour" | "day";
  sampleSize: number;
  /** Total events inside the current range. */
  totals: {
    views: number;
    qrScans: number;
    interactions: number;
    linkClicks: number;
    leads: number;
    sessions: number;
    visitors: number;
  };
  comparisons: {
    views: ComparisonV1;
    qrScans: ComparisonV1;
    interactions: ComparisonV1;
    ctr: ComparisonV1;
    conversion: ComparisonV1;
    visitors: ComparisonV1;
  };
  ctr: number;
  /** Kept as a compatibility alias; UI must label this as interactions/view. */
  interactionRate: number;
  /** Sessions with a meaningful action divided by sessions with a view. */
  actionRate: number;
  conversionRate: number;
  monthToDate: { views: number; interactions: number; leads: number; sessions: number };
  series: {
    views: SeriesPointV1[];
    interactions: SeriesPointV1[];
    qrScans: SeriesPointV1[];
    previousViews: SeriesPointV1[];
  };
  hourly: HourCellV1[];
  bestHour: { hour: number; value: number } | null;
  channels: ChannelMetricV1[];
  activeChannels: ChannelId[];
  topLinks: RankedItemV1[];
  sources: RankedItemV1[];
  devices: RankedItemV1[];
  countries: RankedItemV1[];
  cities: RankedItemV1[];
  audience: { newVisitors: number; returningVisitors: number };
  funnel: FunnelStepV1[];
  records: RecordsV1;
  /** Last 40 events, newest first — feeds Live Activity. */
  recentEvents: AnalyticsEventV1[];
  momentum: MomentumStateV1;
}

export type MomentumStateV1 =
  | "strong_growth"
  | "growing"
  | "stable"
  | "declining"
  | "unusual_activity";

/* ------------------------------------------------------------------ */
/* Intelligence                                                        */
/* ------------------------------------------------------------------ */

export type InsightCategory =
  | "positive"
  | "opportunity"
  | "warning"
  | "record"
  | "trend"
  | "realtime"
  | "goal"
  | "learning";

export type InsightSeverity = "info" | "notable" | "important" | "critical";

export type InsightType =
  | "traffic_spike"
  | "traffic_drop"
  | "channel_spike"
  | "dominant_channel"
  | "ctr_improvement"
  | "ctr_drop"
  | "new_daily_record"
  | "near_daily_record"
  | "new_weekly_record"
  | "best_hour"
  | "hot_time_window"
  | "conversion_improvement"
  | "conversion_deterioration"
  | "top_link_emerging"
  | "underperforming_link"
  | "goal_progress"
  | "goal_projected_success"
  | "goal_at_risk"
  | "realtime_channel_spike"
  | "realtime_surge"
  | "low_data_learning";

/* ------------------------------------------------------------------ */
/* Rolling realtime intelligence (V1.1)                                */
/* ------------------------------------------------------------------ */

export type RollingWindowMinutes = 15 | 30 | 60;

export interface RollingWindowStatV1 {
  windowMinutes: RollingWindowMinutes;
  total: number;
  /** Personal baseline for an equivalent window. Null when history is thin. */
  baselinePerWindow: number | null;
  ratio: number | null;
  series: SeriesPointV1[];
}

export interface RollingChannelSpikeV1 {
  channel: ChannelId;
  label: string;
  windowMinutes: RollingWindowMinutes;
  clicks: number;
  baseline: number;
  ratio: number;
  confidence: number;
}

export interface RollingWindowAnalyticsV1 {
  version: "1";
  now: string;
  windows: RollingWindowStatV1[];
  spikes: RollingChannelSpikeV1[];
  state: "quiet" | "normal" | "rising" | "spike";
  activePerMinute: number;
  sampleSufficient: boolean;
}


/** Contract only — Analytics never mutates a Cripqer editor. */
export interface RecommendedActionV1 {
  type: "open_editor" | "open_analytics" | "upgrade" | "none";
  label: string;
  target?: "link" | "channel" | "cta" | "page";
  targetId?: string;
}

export interface AnalyticsInsightV1 {
  id: string;
  type: InsightType;
  category: InsightCategory;
  title: string;
  message: string;
  severity: InsightSeverity;
  /** 0..1 — driven by sample size and effect strength. */
  confidence: number;
  metrics: Array<{ label: string; value: string }>;
  channel?: ChannelId;
  action?: RecommendedActionV1;
}

/* ------------------------------------------------------------------ */
/* Goals                                                               */
/* ------------------------------------------------------------------ */

export type GoalStatus =
  | "learning"
  | "on_track"
  | "at_risk"
  | "achieved"
  | "behind";

export interface SmartGoalV1 {
  id: string;
  metric: "views" | "interactions" | "leads";
  label: string;
  status: GoalStatus;
  target: number;
  current: number;
  progress: number;
  daysRemaining: number;
  requiredPerDay: number;
  projected: number;
  message: string;
}

/* ------------------------------------------------------------------ */
/* Daily brief                                                         */
/* ------------------------------------------------------------------ */

export interface DailyBriefV1 {
  id: string;
  dateLabel: string;
  headline: string;
  paragraphs: string[];
  bullets: Array<{ label: string; value: string }>;
  state: "learning" | "ready";
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export type NotificationKind =
  | "positive"
  | "opportunity"
  | "warning"
  | "record"
  | "goal"
  | "live";

export interface NotificationCandidateV1 {
  id: string;
  type: InsightType;
  kind: NotificationKind;
  icon: string;
  title: string;
  message: string;
  severity: InsightSeverity;
  /** 0..100 composite score. */
  score: number;
  scoreParts: {
    importance: number;
    anomaly: number;
    confidence: number;
    relevance: number;
    novelty: number;
  };
  createdAt: string;
  action?: RecommendedActionV1;
  /** Channel the notification talks about, when it is channel-scoped. */
  channel?: ChannelId;
  /** Short factual metric shown inside the toast / notification row. */
  metric?: { label: string; value: string };
}

/** A candidate plus its local read/dismiss state, owned by the UI shell. */
export interface NotificationItemV1 extends NotificationCandidateV1 {
  read: boolean;
  dismissed: boolean;
}

export interface NotificationStateV1 {
  /** notification type -> ISO timestamp of last delivery. */
  lastSentAt: Record<string, string>;
  /** ISO timestamps of every delivery, used for the rolling daily cap. */
  recentDeliveries?: string[];
}


/* ------------------------------------------------------------------ */
/* Host boundary                                                       */
/* ------------------------------------------------------------------ */

export interface AnalyticsHostContextV1 {
  profileId: string;
  displayName?: string;
  plan: PlanId;
  /** Channels the user actually has configured in Cripqer. */
  availableChannels: ChannelId[];
  /** Required IANA timezone for all business-date calculations. */
  timezone: string;
  timezoneLabel?: string;
  /** Injected clock so previews and tests stay deterministic. */
  now?: string;
}

export interface AnalyticsHostCallbacksV1 {
  onNotificationCandidate?: (candidate: NotificationCandidateV1) => void;
  onOpenEditorRecommendation?: (action: RecommendedActionV1) => void;
  onUpgradeRequest?: (plan: PlanId) => void;
  onDateRangeChange?: (range: DateRangeV1, period: PeriodId) => void;
  onChannelFilterChange?: (channels: ChannelId[]) => void;
}

/* ------------------------------------------------------------------ */
/* Widget registry                                                     */
/* ------------------------------------------------------------------ */

export type WidgetId =
  | "live_activity"
  | "performance_overview"
  | "performance_trend"
  | "hot_hours"
  | "channel_performance"
  | "top_links"
  | "conversion_funnel"
  | "new_vs_returning"
  | "geography"
  | "devices"
  | "traffic_sources"
  | "period_comparison"
  | "smart_goals"
  | "anomalies_momentum"
  | "intelligence";

export type WidgetVisibility = "visible" | "hidden" | "locked";

export interface WidgetDecisionV1 {
  id: WidgetId;
  title: string;
  visibility: WidgetVisibility;
  reason: string;
  requiredPlan: PlanId;
}
