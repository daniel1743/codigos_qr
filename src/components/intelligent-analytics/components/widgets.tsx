/**
 * CRIPQER INTELLIGENT ANALYTICS V1 — widget components.
 * Presentation only; all intelligence arrives as props.
 */

import type {
  AnalyticsEventV1,
  ChannelId,
  AnalyticsInsightV1,
  AnalyticsMetricsV1,
  DailyBriefV1,
  PlanId,
  RecommendedActionV1,
  SmartGoalV1,
  WidgetDecisionV1,
} from "../analytics.types";
import type { RollingWindowAnalyticsV1, SeriesPointV1 } from "../analytics.types";
import { AreaChart, BarList, Card, Delta, Donut, Heatmap, ProgressRing, PulseBars, Sparkline } from "./charts";

export function LockedWidget({
  decision,
  onUpgrade,
}: {
  decision: WidgetDecisionV1;
  onUpgrade?: ((plan: PlanId) => void) | undefined;
}) {
  return (
    <div className="cq-locked cq-card">
      <span className="cq-badge">{decision.reason}</span>
      <span className="cq-locked__title">{decision.title}</span>
      <p className="cq-empty" style={{ margin: 0 }}>
        Unlock this view to see the full picture. No sample numbers are shown here — only your real data
        once the plan includes it.
      </p>
      <button type="button" className="cq-btn cq-btn--primary" onClick={() => onUpgrade?.(decision.requiredPlan)}>
        Upgrade to {decision.requiredPlan}
      </button>
    </div>
  );
}

function fmtRate(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function ratioSeries(a: SeriesPointV1[], b: SeriesPointV1[]): SeriesPointV1[] {
  return a.map((point, i) => {
    const base = b[i]?.value ?? 0;
    return { key: point.key, label: point.label, value: base > 0 ? Math.round((point.value / base) * 100) : 0 };
  });
}

function toneOf(delta: number | null): string {
  if (delta === null) return "accent";
  if (delta > 1) return "positive";
  if (delta < -1) return "danger";
  return "accent";
}

export function OverviewWidget({
  metrics,
  rolling,
}: {
  metrics: AnalyticsMetricsV1;
  rolling?: RollingWindowAnalyticsV1 | undefined;
}) {
  const liveWindow = rolling?.windows.find((entry) => entry.windowMinutes === 60);
  const kpis: Array<{
    label: string;
    value: string | number;
    delta: number | null;
    series: SeriesPointV1[];
    hint?: string;
    live?: boolean;
  }> = [
    {
      label: "Views",
      value: metrics.totals.views,
      delta: metrics.comparisons.views.deltaPct,
      series: metrics.series.views,
    },
    {
      label: "QR scans",
      value: metrics.totals.qrScans,
      delta: metrics.comparisons.qrScans.deltaPct,
      series: metrics.series.qrScans,
    },
    {
      label: "Interactions",
      value: metrics.totals.interactions,
      delta: metrics.comparisons.interactions.deltaPct,
      series: metrics.series.interactions,
    },
    {
      label: "Interactions/view",
      value: `${metrics.interactionRate.toFixed(2)}×`,
      delta: metrics.comparisons.ctr.deltaPct,
      series: ratioSeries(metrics.series.interactions, metrics.series.views),
    },
    {
      label: "Conversion",
      value: fmtRate(metrics.conversionRate),
      delta: metrics.comparisons.conversion.deltaPct,
      series: [],
      hint: `${metrics.totals.leads} leads`,
    },
  ];

  if (liveWindow) {
    kpis.push({
      label: "Live activity",
      value: liveWindow.total,
      delta: null,
      series: liveWindow.series,
      hint:
        liveWindow.ratio !== null
          ? `${liveWindow.ratio.toFixed(1)}\u00d7 usual \u00b7 last 60 min`
          : "Last 60 min",
      live: true,
    });
  }

  return (
    <div className="cq-kpis">
      {kpis.map((kpi) => (
        <div className="cq-kpi" key={kpi.label} data-live={kpi.live ? "true" : undefined}>
          <span className="cq-kpi__label">
            {kpi.label}
            {kpi.live ? <span className="cq-pulse cq-pulse--sm" aria-hidden="true" /> : null}
          </span>
          <span className="cq-kpi__value">{kpi.value}</span>
          <div className="cq-kpi__foot">
            {kpi.delta !== null || !kpi.live ? <Delta value={kpi.delta} /> : null}
            {kpi.hint ? <span className="cq-kpi__hint">{kpi.hint}</span> : null}
          </div>
          {kpi.series.length > 0 ? (
            <Sparkline series={kpi.series} tone={kpi.live ? "record" : toneOf(kpi.delta)} height={30} />
          ) : null}
        </div>
      ))}
    </div>
  );
}

const ROLLING_STATE_COPY: Record<RollingWindowAnalyticsV1["state"], string> = {
  quiet: "Quiet right now \u2014 no activity in the last hour.",
  normal: "Activity is running at your usual pace.",
  rising: "Activity is picking up versus your usual pace.",
  spike: "Unusual burst of activity happening right now.",
};

export function RealtimeWidget({
  rolling,
  onAction,
}: {
  rolling: RollingWindowAnalyticsV1;
  onAction?: (action: RecommendedActionV1) => void;
}) {
  const spike = rolling.spikes[0];
  const fifteen = rolling.windows.find((entry) => entry.windowMinutes === 15);
  return (
    <Card
      title="Right now"
      hint="Rolling 15 / 30 / 60 minute windows"
      className="cq-grid__wide"
      actions={<span className="cq-pulse" aria-hidden="true" />}
    >
      <p className="cq-realtime__state" data-state={rolling.state}>
        {ROLLING_STATE_COPY[rolling.state]}
      </p>
      {fifteen ? <PulseBars series={fifteen.series} tone={rolling.state === "spike" ? "record" : "accent"} /> : null}
      <div className="cq-kpis cq-kpis--compact">
        {rolling.windows.map((window) => (
          <div className="cq-kpi" key={window.windowMinutes}>
            <span className="cq-kpi__label">Last {window.windowMinutes} min</span>
            <span className="cq-kpi__value" style={{ fontSize: 20 }}>
              {window.total}
            </span>
            <span className="cq-kpi__hint">
              {window.ratio === null ? "Baseline still building" : `${window.ratio.toFixed(1)}\u00d7 usual`}
            </span>
          </div>
        ))}
      </div>
      {spike ? (
        <div className="cq-insight" data-category="realtime">
          <span className="cq-insight__mark" aria-hidden="true" />
          <div style={{ minWidth: 0, flex: 1 }}>
            <h4 className="cq-insight__title">{spike.label} is heating up</h4>
            <p className="cq-insight__msg">
              {spike.clicks} clicks on your {spike.label} link from Cripqer
              during the last {spike.windowMinutes} minutes. That is {spike.ratio.toFixed(1)}× your usual activity.
            </p>
            <button
              type="button"
              className="cq-btn"
              style={{ marginTop: 10 }}
              onClick={() => onAction?.({ type: "open_analytics", label: "View activity" })}
            >
              View activity
            </button>
          </div>
        </div>
      ) : null}
      <p className="cq-card__hint" style={{ marginTop: 4 }}>
        Computed from the events already loaded in this session — no live socket is claimed.
      </p>
    </Card>
  );
}

export function TrendWidget({ metrics }: { metrics: AnalyticsMetricsV1 }) {
  return (
    <Card
      title="Performance trend"
      hint={`${metrics.granularity === "hour" ? "Hourly" : "Daily"} views versus the previous period`}
      className="cq-grid__wide"
    >
      <AreaChart series={metrics.series.views} compare={metrics.series.previousViews} label="Views" />
      <div className="cq-legend">
        <span>
          <span className="cq-legend__dot" style={{ background: "var(--cq-accent)" }} />
          This period
        </span>
        <span>
          <span className="cq-legend__dot" style={{ background: "var(--cq-muted)" }} />
          Previous period
        </span>
      </div>
    </Card>
  );
}

export function BriefWidget({ brief }: { brief: DailyBriefV1 }) {
  return (
    <Card className="cq-grid__full cq-brief" title="Daily brief" hint={brief.dateLabel}>
      <h2 className="cq-brief__headline">{brief.headline}</h2>
      {brief.paragraphs.map((paragraph, i) => (
        <p key={i}>{paragraph}</p>
      ))}
      <div className="cq-brief__bullets">
        {brief.bullets.map((bullet) => (
          <div className="cq-kpi" key={bullet.label}>
            <span className="cq-kpi__label">{bullet.label}</span>
            <span className="cq-kpi__value" style={{ fontSize: 18 }}>
              {bullet.value}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function InsightsWidget({
  insights,
  onAction,
}: {
  insights: AnalyticsInsightV1[];
  onAction?: (action: RecommendedActionV1) => void;
}) {
  return (
    <Card title="Cripqer intelligence" hint="Plain-language reading of your data" className="cq-grid__wide">
      {insights.length === 0 ? <p className="cq-empty">Nothing worth flagging in this period.</p> : null}
      <div style={{ display: "grid", gap: 10 }}>
        {insights.map((insight) => (
          <article className="cq-insight" data-category={insight.category} key={insight.id}>
            <span className="cq-insight__mark" aria-hidden="true" />
            <div style={{ minWidth: 0, flex: 1 }}>
              <h4 className="cq-insight__title">{insight.title}</h4>
              <p className="cq-insight__msg">{insight.message}</p>
              <div className="cq-insight__meta">
                {insight.metrics.map((metric) => (
                  <span key={metric.label}>
                    {metric.label}: {metric.value}
                  </span>
                ))}
                <span>Confidence {Math.round(insight.confidence * 100)}%</span>
              </div>
              {insight.action && insight.action.type !== "none" ? (
                <button
                  type="button"
                  className="cq-btn"
                  style={{ marginTop: 10 }}
                  onClick={() => onAction?.(insight.action as RecommendedActionV1)}
                >
                  {insight.action.label}
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}

export function ChannelsWidget({
  metrics,
  availableChannels,
}: {
  metrics: AnalyticsMetricsV1;
  availableChannels?: ChannelId[];
}) {
  const channels =
    availableChannels && availableChannels.length > 0
      ? metrics.channels.filter((channel) => availableChannels.includes(channel.channel))
      : metrics.channels;
  return (
    <Card title="Channel performance" hint="Only the channels you have configured">
      <BarList
        items={channels.map((channel) => ({
          id: channel.channel,
          label: channel.label,
          value: channel.clicks,
          previousValue: channel.previousClicks,
          deltaPct: channel.deltaPct,
          share: channel.share,
        }))}
        emptyLabel="No channel clicks yet"
        formatValue={(item) => `${item.value} · ${Math.round(item.share * 100)}%`}
      />
    </Card>
  );
}

export function TopLinksWidget({ metrics }: { metrics: AnalyticsMetricsV1 }) {
  return (
    <Card title="Top links" hint="Most used destinations">
      <BarList items={metrics.topLinks} emptyLabel="No link clicks yet" />
    </Card>
  );
}

export function HotHoursWidget({ metrics }: { metrics: AnalyticsMetricsV1 }) {
  const best = metrics.bestHour;
  return (
    <Card
      title="Hot hours"
      hint={best ? `Peak around ${String(best.hour).padStart(2, "0")}:00` : "Activity by weekday and hour"}
      className="cq-grid__wide"
    >
      <Heatmap cells={metrics.hourly} />
    </Card>
  );
}

export function FunnelWidget({ metrics }: { metrics: AnalyticsMetricsV1 }) {
  return (
    <Card title="Conversion funnel" hint="Scan → view → interaction → action">
      <div className="cq-funnel">
        {metrics.funnel.map((step) => (
          <div className="cq-funnel__step" key={step.id}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{step.label}</span>
            <span style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
              <strong>{step.value}</strong>
              {step.stepRate !== null ? (
                <span className="cq-funnel__rate">{Math.round(step.stepRate * 100)}%</span>
              ) : null}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function AudienceWidget({ metrics }: { metrics: AnalyticsMetricsV1 }) {
  const total = metrics.audience.newVisitors + metrics.audience.returningVisitors;
  return (
    <Card title="New vs returning" hint={`${total} sessions in this period`}>
      <Donut
        items={[
          {
            id: "new",
            label: "New",
            value: metrics.audience.newVisitors,
            previousValue: 0,
            deltaPct: null,
            share: 0,
          },
          {
            id: "returning",
            label: "Returning",
            value: metrics.audience.returningVisitors,
            previousValue: 0,
            deltaPct: null,
            share: 0,
          },
        ]}
      />
    </Card>
  );
}

export function GeographyWidget({ metrics }: { metrics: AnalyticsMetricsV1 }) {
  return (
    <Card title="Geography" hint="Approximate, from country-level signals">
      <BarList items={metrics.countries.slice(0, 6)} emptyLabel="No location signals" />
      {metrics.cities.length > 0 ? (
        <>
          <div className="cq-card__hint">Cities</div>
          <BarList items={metrics.cities.slice(0, 5)} />
        </>
      ) : null}
    </Card>
  );
}

export function DevicesWidget({ metrics }: { metrics: AnalyticsMetricsV1 }) {
  return (
    <Card title="Devices" hint="By device (from browser signal)">
      <Donut items={metrics.devices} />
    </Card>
  );
}

export function SourcesWidget({ metrics }: { metrics: AnalyticsMetricsV1 }) {
  return (
    <Card title="Traffic sources" hint="Where the visit came from">
      <BarList items={metrics.sources.slice(0, 6)} emptyLabel="No sources detected" />
    </Card>
  );
}

export function ComparisonWidget({ metrics }: { metrics: AnalyticsMetricsV1 }) {
  const rows = [
    { label: "Views", now: metrics.comparisons.views.current, before: metrics.comparisons.views.previous, delta: metrics.comparisons.views.deltaPct },
    { label: "Interactions", now: metrics.comparisons.interactions.current, before: metrics.comparisons.interactions.previous, delta: metrics.comparisons.interactions.deltaPct },
    { label: "QR scans", now: metrics.comparisons.qrScans.current, before: metrics.comparisons.qrScans.previous, delta: metrics.comparisons.qrScans.deltaPct },
    { label: "Visitors", now: metrics.comparisons.visitors.current, before: metrics.comparisons.visitors.previous, delta: metrics.comparisons.visitors.deltaPct },
  ];
  return (
    <Card title="Period comparison" hint="This period versus the one before">
      <div style={{ display: "grid", gap: 10 }}>
        {rows.map((row) => (
          <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{row.label}</span>
            <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span className="cq-card__hint">
                {row.before} → <strong style={{ color: "var(--cq-text)" }}>{row.now}</strong>
              </span>
              <Delta value={row.delta} />
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

const MOMENTUM_COPY: Record<AnalyticsMetricsV1["momentum"], string> = {
  strong_growth: "Strong growth — your page is clearly accelerating.",
  growing: "Growing steadily compared with the previous period.",
  stable: "Stable performance, no meaningful swing.",
  declining: "Cooling down. Worth resharing your page.",
  unusual_activity: "Unusual activity detected today versus your normal pace.",
};

export function MomentumWidget({ metrics }: { metrics: AnalyticsMetricsV1 }) {
  const tone =
    metrics.momentum === "declining"
      ? "danger"
      : metrics.momentum === "unusual_activity"
        ? "record"
        : metrics.momentum === "stable"
          ? "accent"
          : "positive";
  return (
    <Card title="Momentum & anomalies" hint="Rule-based, from your own baseline">
      <div className="cq-momentum" data-tone={tone}>
        <Sparkline series={metrics.series.views} tone={tone} height={44} />
        <span className="cq-badge" data-tone={metrics.momentum}>
          {metrics.momentum.replace(/_/g, " ")}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>{MOMENTUM_COPY[metrics.momentum]}</p>
      <div className="cq-kpis" style={{ gridTemplateColumns: "repeat(2, minmax(0,1fr))" }}>
        <div className="cq-kpi">
          <span className="cq-kpi__label">Best day</span>
          <span className="cq-kpi__value" style={{ fontSize: 18 }}>
            {metrics.records.bestDayValue}
          </span>
          <span className="cq-card__hint">{metrics.records.bestDayLabel ?? "—"}</span>
        </div>
        <div className="cq-kpi">
          <span className="cq-kpi__label">Daily average</span>
          <span className="cq-kpi__value" style={{ fontSize: 18 }}>
            {metrics.records.averageDailyValue.toFixed(1)}
          </span>
          <span className="cq-card__hint">Today: {metrics.records.todayValue}</span>
        </div>
      </div>
    </Card>
  );
}

export function GoalsWidget({ goals }: { goals: SmartGoalV1[] }) {
  return (
    <Card title="Smart goals" hint="Targets derived from your own history">
      <div style={{ display: "grid", gap: 10 }}>
        {goals.map((goal) => (
          <div className="cq-goal" key={goal.id}>
            <div className="cq-goal__head">
              <strong style={{ fontSize: 13 }}>{goal.label}</strong>
              <span className="cq-badge" data-tone={goal.status}>
                {goal.status.replace("_", " ")}
              </span>
            </div>
            {goal.status !== "learning" ? (
              <div className="cq-goal__body">
                <ProgressRing
                  value={goal.progress}
                  tone={goal.status === "behind" ? "danger" : goal.status === "at_risk" ? "warning" : "positive"}
                  caption={`${goal.label} progress`}
                />
                <div style={{ minWidth: 0, flex: 1, display: "grid", gap: 6 }}>
                  <span className="cq-bar__track">
                    <span className="cq-bar__fill" style={{ width: `${Math.round(goal.progress * 100)}%` }} />
                  </span>
                  <span className="cq-card__hint">
                    {goal.current} of {goal.target} · projected {goal.projected} · {goal.daysRemaining} days left
                  </span>
                </div>
              </div>
            ) : null}
            <p className="cq-insight__msg" style={{ margin: 0 }}>
              {goal.message}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

const EVENT_COPY: Partial<Record<AnalyticsEventV1["eventType"], string>> = {
  page_view: "Page view",
  smart_page_view: "Smart page view",
  qr_scan: "QR scan",
  whatsapp_click: "WhatsApp click",
  instagram_click: "Instagram click",
  facebook_click: "Facebook click",
  tiktok_click: "TikTok click",
  youtube_click: "YouTube click",
  linkedin_click: "LinkedIn click",
  external_link_click: "Link click",
  cta_click: "Main button",
  lead_created: "New lead",
  share: "Share",
  return_visit: "Returning visitor",
};

export function LiveActivityWidget({
  events,
  now,
}: {
  events: AnalyticsEventV1[];
  now: Date;
}) {
  return (
    <Card
      title="Live activity"
      hint="Most recent signals"
      actions={<span className="cq-pulse" aria-hidden="true" />}
    >
      <div className="cq-feed" role="log" aria-live="polite">
        {events.length === 0 ? <p className="cq-empty">No activity yet</p> : null}
        {events.slice(0, 12).map((event) => (
          <div className="cq-feed__row" key={event.id}>
            <span>
              {EVENT_COPY[event.eventType] ?? event.eventType}
              {event.linkLabel ? ` · ${event.linkLabel}` : ""}
            </span>
            <span className="cq-feed__time">{relativeTime(event.timestamp, now)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function relativeTime(timestamp: string, now: Date): string {
  const diff = now.getTime() - Date.parse(timestamp);
  if (!Number.isFinite(diff)) return "";
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
