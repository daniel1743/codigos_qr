/** CRIPQER INTELLIGENT ANALYTICS V1 — public surface. */

export * from "./analytics.types";
export {
  computeMetrics,
  resolveRange,
  previousRangeOf,
  isViewEvent,
  isInteractionEvent,
  isTopLinkEvent,
  channelOf,
  type ComputeMetricsInput,
} from "./metrics-engine";
export {
  generateInsights,
  LEARNING_THRESHOLD,
  TREND_THRESHOLD,
  type GenerateInsightsOptionsV1,
} from "./intelligence-engine";
export {
  computeRollingWindow,
  ROLLING_WINDOWS,
  ROLLING_MIN_SAMPLE,
  ROLLING_SPIKE_RATIO,
  ROLLING_BASELINE_HOURS,
  type ComputeRollingInput,
} from "./rolling-window";
export { generateSmartGoals } from "./goals-engine";
export { buildDailyBrief } from "./daily-brief";
export {
  scoreNotifications,
  EMPTY_NOTIFICATION_STATE,
  MAX_NOTIFICATIONS_PER_DAY,
  type ScoreNotificationsInput,
  type ScoreNotificationsResult,
} from "./notification-engine";
export { resolveWidgets, widgetMap, planRank } from "./widget-registry";
export {
  fromLegacyAnalyticsRecord,
  fromLegacyAnalyticsRecords,
  toAnalyticsEventV1,
  toAnalyticsEventsV1,
  provenanceOf,
  type CripqerLegacyAnalyticsEvent,
  type AdapterContext,
  type ProvenanceClass,
  type FieldProvenance,
} from "./cripqer-event-adapter";
export {
  inferAvailability,
  resolveRealDataWidgets,
  SESSION_DEPENDENT_WIDGET_IDS,
  type RealDataAvailabilityV1,
} from "./real-data-capability";
export { AnalyticsDashboard, type AnalyticsDashboardProps } from "./components/AnalyticsDashboard";
export { NotificationToasts } from "./components/NotificationToasts";
export { NotificationCenter } from "./components/NotificationCenter";
export { ANALYTICS_SCENARIOS, buildScenarioEvents, type ScenarioId } from "./analytics.fixtures";
