/**
 * CRIPQER INTELLIGENT ANALYTICS V1.1 — adaptive premium dashboard.
 *
 * Presentation + orchestration of the pure engines. No network, no storage.
 * The host injects events, plan, identity and a clock.
 */

import { useEffect, useMemo, useRef, useState } from "react";

import {
  CHANNEL_LABEL,
  type AnalyticsEventV1,
  type AnalyticsHostCallbacksV1,
  type AnalyticsHostContextV1,
  type ChannelId,
  type DateRangeV1,
  type NotificationItemV1,
  type NotificationStateV1,
  type PeriodId,
  type RecommendedActionV1,
  type WidgetId,
} from "../analytics.types";
import { buildDailyBrief } from "../daily-brief";
import { generateSmartGoals } from "../goals-engine";
import { generateInsights } from "../intelligence-engine";
import { computeMetrics, resolveRange } from "../metrics-engine";
import { EMPTY_NOTIFICATION_STATE, scoreNotifications } from "../notification-engine";
import { computeRollingWindow } from "../rolling-window";
import { resolveWidgets, widgetMap } from "../widget-registry";
import { NotificationCenter } from "./NotificationCenter";
import { NotificationToasts } from "./NotificationToasts";
import { LockedWidget } from "./widgets";
import {
  AudienceWidget,
  BriefWidget,
  ChannelsWidget,
  ComparisonWidget,
  DevicesWidget,
  FunnelWidget,
  GeographyWidget,
  GoalsWidget,
  HotHoursWidget,
  InsightsWidget,
  LiveActivityWidget,
  MomentumWidget,
  OverviewWidget,
  RealtimeWidget,
  SourcesWidget,
  TopLinksWidget,
  TrendWidget,
} from "./widgets";

const PERIODS: Array<{ id: PeriodId; label: string }> = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
];

export interface AnalyticsDashboardProps {
  events: AnalyticsEventV1[];
  context: AnalyticsHostContextV1;
  callbacks?: AnalyticsHostCallbacksV1;
  notificationState?: NotificationStateV1;
  theme?: "light" | "dark";
  /** Rendered above the widget grid (host chrome, tabs, breadcrumbs…). */
  slot?: React.ReactNode;
  loading?: boolean;
}

export function AnalyticsDashboard({
  events,
  context,
  callbacks,
  notificationState = EMPTY_NOTIFICATION_STATE,
  theme = "light",
  slot,
  loading = false,
}: AnalyticsDashboardProps) {
  const now = useMemo(() => (context.now ? new Date(context.now) : new Date()), [context.now]);
  const [period, setPeriod] = useState<PeriodId>("30d");
  const [channelFilter, setChannelFilter] = useState<ChannelId[]>([]);
  const [centerOpen, setCenterOpen] = useState(false);
  const [items, setItems] = useState<NotificationItemV1[]>([]);
  const seen = useRef<Set<string>>(new Set());

  const range: DateRangeV1 = useMemo(() => resolveRange(period, now, context.timezone), [period, now, context.timezone]);

  const scoped = useMemo(() => {
    if (channelFilter.length === 0) return events;
    return events.filter((event) => {
      const platform = event.platform as ChannelId | undefined;
      if (!platform) return true;
      return channelFilter.includes(platform);
    });
  }, [events, channelFilter]);

  const metrics = useMemo(
    () => computeMetrics({ events: scoped, range, now, timezone: context.timezone }),
    [scoped, range, now, context.timezone],
  );
  const rolling = useMemo(() => computeRollingWindow({ events: scoped, now, timezone: context.timezone }), [scoped, now, context.timezone]);
  const goals = useMemo(() => generateSmartGoals(metrics, now, context.timezone), [metrics, now, context.timezone]);
  const insights = useMemo(
    () => generateInsights(metrics, { rolling, goals }),
    [metrics, rolling, goals],
  );
  const brief = useMemo(() => buildDailyBrief(metrics, insights, goals, now), [metrics, insights, goals, now]);
  const notifications = useMemo(
    () => scoreNotifications({ insights, metrics, state: notificationState, now }),
    [insights, metrics, notificationState, now],
  );
  const widgets = useMemo(
    () => widgetMap(resolveWidgets(metrics, context.plan)),
    [metrics, context.plan],
  );

  /* Notification centre feed + host callback ------------------------- */
  useEffect(() => {
    const fresh = notifications.candidates.filter((candidate) => !seen.current.has(candidate.id));
    if (fresh.length === 0) return;
    for (const candidate of fresh) {
      seen.current.add(candidate.id);
      callbacks?.onNotificationCandidate?.(candidate);
    }
    setItems((prev) => [
      ...fresh.map((candidate) => ({ ...candidate, read: false, dismissed: false })),
      ...prev,
    ]);
  }, [notifications.candidates, callbacks]);

  const handleAction = (action: RecommendedActionV1) => {
    if (action.type === "upgrade") callbacks?.onUpgradeRequest?.("pro");
    else callbacks?.onOpenEditorRecommendation?.(action);
  };

  const changePeriod = (next: PeriodId) => {
    setPeriod(next);
    callbacks?.onDateRangeChange?.(resolveRange(next, now, context.timezone), next);
  };

  const toggleChannel = (channel: ChannelId) => {
    const next = channelFilter.includes(channel)
      ? channelFilter.filter((entry) => entry !== channel)
      : [...channelFilter, channel];
    setChannelFilter(next);
    callbacks?.onChannelFilterChange?.(next);
  };

  const patch = (id: string, changes: Partial<NotificationItemV1>) =>
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...changes } : item)));

  const show = (id: WidgetId) => widgets[id]?.visibility === "visible";
  const locked = (id: WidgetId) => widgets[id]?.visibility === "locked";
  const learning = metrics.sampleSize < 25;
  const firstName = context.displayName?.split(" ")[0];

  return (
    <div className="cq-analytics" data-theme={theme}>
      <div className="cq-shell">
        <header className="cq-header">
          <div className="cq-header__top">
            <div className="cq-header__id">
              <h1 className="cq-header__title">
                {context.displayName ? `${context.displayName} · Analytics` : "Analytics"}
              </h1>
              <p className="cq-header__subtitle">
                {metrics.sampleSize} signals in this period
                {context.timezoneLabel ? ` · ${context.timezoneLabel}` : ""}
                {rolling.state === "spike" ? " · unusual activity right now" : ""}
              </p>
            </div>
            <div className="cq-controls">
              <div className="cq-segment" role="group" aria-label="Period">
                {PERIODS.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="cq-segment__btn"
                    aria-pressed={period === entry.id}
                    onClick={() => changePeriod(entry.id)}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
              <NotificationCenter
                items={items}
                open={centerOpen}
                onToggle={setCenterOpen}
                onRead={(id) => patch(id, { read: true })}
                onDismiss={(id) => patch(id, { dismissed: true, read: true })}
                onMarkAllRead={() => setItems((prev) => prev.map((item) => ({ ...item, read: true })))}
                onAction={handleAction}
              />
            </div>
          </div>

          {context.availableChannels.length > 1 ? (
            <div className="cq-controls" role="group" aria-label="Channel filter">
              {context.availableChannels.map((channel) => (
                <button
                  key={channel}
                  type="button"
                  className="cq-chip"
                  aria-pressed={channelFilter.includes(channel)}
                  onClick={() => toggleChannel(channel)}
                >
                  {CHANNEL_LABEL[channel]}
                </button>
              ))}
            </div>
          ) : null}
        </header>

        {slot}

        {loading ? (
          <div className="cq-grid">
            {Array.from({ length: 6 }, (_, i) => (
              <div className="cq-card" key={i}>
                <div className="cq-skeleton" style={{ width: "40%" }} />
                <div className="cq-skeleton" style={{ height: 96 }} />
              </div>
            ))}
          </div>
        ) : (
          <>
            <section className="cq-welcome" data-state={learning ? "learning" : rolling.state}>
              <div>
                <p className="cq-welcome__eyebrow">{brief.dateLabel}</p>
                <h2 className="cq-welcome__title">
                  {firstName ? `Hi ${firstName} — ` : ""}
                  {learning ? "Cripqer is still learning your audience" : brief.headline}
                </h2>
                <p className="cq-welcome__msg">{brief.paragraphs[0]}</p>
              </div>
              {!learning && rolling.state !== "quiet" ? (
                <div className="cq-welcome__live">
                  <span className="cq-pulse" aria-hidden="true" />
                  <strong>{rolling.windows.find((w) => w.windowMinutes === 60)?.total ?? 0}</strong>
                  <span>signals in the last hour</span>
                </div>
              ) : null}
            </section>

            <OverviewWidget metrics={metrics} rolling={rolling} />

            <div className="cq-grid">
              {show("live_activity") ? <RealtimeWidget rolling={rolling} onAction={handleAction} /> : null}
              {show("intelligence") ? <InsightsWidget insights={insights} onAction={handleAction} /> : null}
              {show("performance_trend") ? <TrendWidget metrics={metrics} /> : null}
              <BriefWidget brief={brief} />
              {show("live_activity") ? <LiveActivityWidget events={metrics.recentEvents} now={now} /> : null}
              {show("channel_performance") ? (
                <ChannelsWidget metrics={metrics} availableChannels={context.availableChannels} />
              ) : null}
              {show("top_links") ? <TopLinksWidget metrics={metrics} /> : null}

              {show("smart_goals") ? <GoalsWidget goals={goals} /> : null}
              {locked("smart_goals") ? (
                <LockedWidget decision={widgets.smart_goals} onUpgrade={callbacks?.onUpgradeRequest} />
              ) : null}

              {show("hot_hours") ? <HotHoursWidget metrics={metrics} /> : null}
              {locked("hot_hours") ? (
                <LockedWidget decision={widgets.hot_hours} onUpgrade={callbacks?.onUpgradeRequest} />
              ) : null}

              {show("period_comparison") ? <ComparisonWidget metrics={metrics} /> : null}
              {show("traffic_sources") ? <SourcesWidget metrics={metrics} /> : null}
              {show("devices") ? <DevicesWidget metrics={metrics} /> : null}
              {locked("traffic_sources") ? (
                <LockedWidget decision={widgets.traffic_sources} onUpgrade={callbacks?.onUpgradeRequest} />
              ) : null}

              {show("conversion_funnel") ? <FunnelWidget metrics={metrics} /> : null}
              {locked("conversion_funnel") ? (
                <LockedWidget decision={widgets.conversion_funnel} onUpgrade={callbacks?.onUpgradeRequest} />
              ) : null}

              {show("new_vs_returning") ? <AudienceWidget metrics={metrics} /> : null}
              {show("geography") ? <GeographyWidget metrics={metrics} /> : null}
              {locked("geography") ? (
                <LockedWidget decision={widgets.geography} onUpgrade={callbacks?.onUpgradeRequest} />
              ) : null}

              {show("anomalies_momentum") ? <MomentumWidget metrics={metrics} /> : null}
            </div>
          </>
        )}
      </div>

      <NotificationToasts
        candidates={notifications.candidates}
        onAction={handleAction}
        onDismiss={(id) => patch(id, { read: true })}
      />
    </div>
  );
}
