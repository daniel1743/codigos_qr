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
import {
  decimalEs,
  devicesEs,
  EVENT_COPY,
  funnelEs,
  GOAL_STATUS_LABEL,
  GRANULARITY_LABEL,
  LOCKED_WIDGET_HONESTY,
  lockedWidgetValue,
  METRIC_COPY,
  MOMENTUM_COPY,
  MOMENTUM_LABEL,
  rateEs,
  relativeTimeEs,
  ROLLING_STATE_COPY,
  sourcesEs,
  upgradeCta,
} from "../copy.es-419";
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
        {lockedWidgetValue(decision.requiredPlan)} {LOCKED_WIDGET_HONESTY}
      </p>
      <button type="button" className="cq-btn cq-btn--primary" onClick={() => onUpgrade?.(decision.requiredPlan)}>
        {upgradeCta(decision.requiredPlan)}
      </button>
    </div>
  );
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
      label: `${METRIC_COPY.views.primary} ${METRIC_COPY.views.technical}`,
      value: metrics.totals.views,
      delta: metrics.comparisons.views.deltaPct,
      series: metrics.series.views,
    },
    {
      label: `${METRIC_COPY.qrScans.primary} ${METRIC_COPY.qrScans.technical}`,
      value: metrics.totals.qrScans,
      delta: metrics.comparisons.qrScans.deltaPct,
      series: metrics.series.qrScans,
    },
    {
      label: `${METRIC_COPY.interactions.primary} ${METRIC_COPY.interactions.technical}`,
      value: metrics.totals.interactions,
      delta: metrics.comparisons.interactions.deltaPct,
      series: metrics.series.interactions,
    },
    {
      label: `${METRIC_COPY.interactionsPerView.primary} ${METRIC_COPY.interactionsPerView.technical}`,
      value: `${decimalEs(metrics.interactionRate)}\u00d7`,
      delta: metrics.comparisons.ctr.deltaPct,
      series: ratioSeries(metrics.series.interactions, metrics.series.views),
    },
    {
      label: `${METRIC_COPY.conversion.primary} ${METRIC_COPY.conversion.technical}`,
      value: rateEs(metrics.conversionRate),
      delta: metrics.comparisons.conversion.deltaPct,
      series: [],
      hint: `${metrics.totals.leads} contactos`,
    },
  ];

  if (liveWindow) {
    kpis.push({
      label: `${METRIC_COPY.liveActivity.primary} ${METRIC_COPY.liveActivity.technical}`,
      value: liveWindow.total,
      delta: null,
      series: liveWindow.series,
      hint:
        liveWindow.ratio !== null
          ? `${decimalEs(liveWindow.ratio, 1)}\u00d7 lo habitual \u00b7 últimos 60 min`
          : "Últimos 60 min",
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
      title="Ahora mismo"
      hint="Ventanas móviles de 15, 30 y 60 minutos"
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
            <span className="cq-kpi__label">Últimos {window.windowMinutes} min</span>
            <span className="cq-kpi__value" style={{ fontSize: 20 }}>
              {window.total}
            </span>
            <span className="cq-kpi__hint">
              {window.ratio === null
                ? "Todavía estamos conociendo tu ritmo habitual"
                : `${decimalEs(window.ratio, 1)}\u00d7 lo habitual`}
            </span>
          </div>
        ))}
      </div>
      {spike ? (
        <div className="cq-insight" data-category="realtime">
          <span className="cq-insight__mark" aria-hidden="true" />
          <div style={{ minWidth: 0, flex: 1 }}>
            <h4 className="cq-insight__title">Ahora mismo {spike.label} está recibiendo más acciones</h4>
            <p className="cq-insight__msg">
              Registramos {spike.clicks} acciones hacia {spike.label} durante los últimos{" "}
              {spike.windowMinutes} minutos. Es {decimalEs(spike.ratio, 1)}× tu actividad habitual.
            </p>
            <button
              type="button"
              className="cq-btn"
              style={{ marginTop: 10 }}
              onClick={() => onAction?.({ type: "open_analytics", label: "Ver la actividad" })}
            >
              Ver la actividad
            </button>
          </div>
        </div>
      ) : null}
      <p className="cq-card__hint" style={{ marginTop: 4 }}>
        Se calcula con la actividad ya cargada en esta sesión: no hay conexión en vivo.
      </p>
    </Card>
  );
}

export function TrendWidget({ metrics }: { metrics: AnalyticsMetricsV1 }) {
  return (
    <Card
      title="Cómo evolucionaron tus visitas"
      hint={`Visitas ${GRANULARITY_LABEL[metrics.granularity]} comparadas con el período anterior`}
      className="cq-grid__wide"
    >
      <AreaChart
        series={metrics.series.views}
        compare={metrics.series.previousViews}
        label={`${METRIC_COPY.views.primary} ${METRIC_COPY.views.technical}`}
      />
      <div className="cq-legend">
        <span>
          <span className="cq-legend__dot" style={{ background: "var(--cq-accent)" }} />
          Este período
        </span>
        <span>
          <span className="cq-legend__dot" style={{ background: "var(--cq-muted)" }} />
          Período anterior
        </span>
      </div>
    </Card>
  );
}

export function BriefWidget({ brief }: { brief: DailyBriefV1 }) {
  return (
    <Card className="cq-grid__full cq-brief" title="Resumen del día" hint={brief.dateLabel}>
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
    <Card
      title="Lo que Cripqer detectó"
      hint="Una lectura en palabras simples de tus datos"
      className="cq-grid__wide"
    >
      {insights.length === 0 ? (
        <p className="cq-empty">En este período no hubo nada que valga la pena destacar.</p>
      ) : null}
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
                <span>Nivel de confianza: {Math.round(insight.confidence * 100)}%</span>
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
    <Card title="Qué canales están funcionando" hint="Solo los canales que tienes configurados">
      <BarList
        items={channels.map((channel) => ({
          id: channel.channel,
          label: channel.label,
          value: channel.clicks,
          previousValue: channel.previousClicks,
          deltaPct: channel.deltaPct,
          share: channel.share,
        }))}
        emptyLabel="Todavía no hay acciones en tus enlaces"
        formatValue={(item) => `${item.value} acciones · ${Math.round(item.share * 100)}%`}
      />
    </Card>
  );
}

export function TopLinksWidget({ metrics }: { metrics: AnalyticsMetricsV1 }) {
  return (
    <Card title="Enlaces que más interesaron" hint="Los destinos con más acciones en este período">
      <BarList items={metrics.topLinks} emptyLabel="Todavía no hay acciones registradas" />
    </Card>
  );
}

export function HotHoursWidget({ metrics }: { metrics: AnalyticsMetricsV1 }) {
  const best = metrics.bestHour;
  return (
    <Card
      title="Horas con más actividad"
      hint={
        best
          ? `Más actividad alrededor de las ${String(best.hour).padStart(2, "0")}:00`
          : "Actividad por día de la semana y hora"
      }
      className="cq-grid__wide"
    >
      <Heatmap cells={metrics.hourly} />
    </Card>
  );
}

export function FunnelWidget({ metrics }: { metrics: AnalyticsMetricsV1 }) {
  return (
    <Card title="Qué hicieron después de entrar" hint="Entrada → visita → acción → dejan sus datos">
      <div className="cq-funnel">
        {funnelEs(metrics.funnel).map((step) => (
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
    <Card
      title="Personas nuevas y personas que regresaron"
      hint={`${total} visitas consideradas en este período`}
    >
      <Donut
        items={[
          {
            id: "new",
            label: "Personas nuevas",
            value: metrics.audience.newVisitors,
            previousValue: 0,
            deltaPct: null,
            share: 0,
          },
          {
            id: "returning",
            label: "Personas que volvieron",
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
    <Card title="Desde dónde te visitan" hint="Aproximado, según las señales de país">
      <BarList items={metrics.countries.slice(0, 6)} emptyLabel="Todavía no hay señales de ubicación" />
      {metrics.cities.length > 0 ? (
        <>
          <div className="cq-card__hint">Ciudades</div>
          <BarList items={metrics.cities.slice(0, 5)} />
        </>
      ) : null}
    </Card>
  );
}

export function DevicesWidget({ metrics }: { metrics: AnalyticsMetricsV1 }) {
  return (
    <Card title="Dispositivos utilizados" hint="Según la señal del navegador">
      <Donut items={devicesEs(metrics.devices)} />
    </Card>
  );
}

export function SourcesWidget({ metrics }: { metrics: AnalyticsMetricsV1 }) {
  return (
    <Card title="De dónde llegaron tus visitas" hint="El origen de cada visita">
      <BarList
        items={sourcesEs(metrics.sources).slice(0, 6)}
        emptyLabel="Todavía no podemos saber de dónde llegaron"
      />
    </Card>
  );
}

export function ComparisonWidget({ metrics }: { metrics: AnalyticsMetricsV1 }) {
  const rows = [
    { label: `${METRIC_COPY.views.primary} ${METRIC_COPY.views.technical}`, now: metrics.comparisons.views.current, before: metrics.comparisons.views.previous, delta: metrics.comparisons.views.deltaPct },
    { label: `${METRIC_COPY.interactions.primary} ${METRIC_COPY.interactions.technical}`, now: metrics.comparisons.interactions.current, before: metrics.comparisons.interactions.previous, delta: metrics.comparisons.interactions.deltaPct },
    { label: `${METRIC_COPY.qrScans.primary} ${METRIC_COPY.qrScans.technical}`, now: metrics.comparisons.qrScans.current, before: metrics.comparisons.qrScans.previous, delta: metrics.comparisons.qrScans.deltaPct },
    { label: `${METRIC_COPY.visitors.primary} ${METRIC_COPY.visitors.technical}`, now: metrics.comparisons.visitors.current, before: metrics.comparisons.visitors.previous, delta: metrics.comparisons.visitors.deltaPct },
  ];
  return (
    <Card title="Cómo vas comparado con el período anterior" hint="Este período frente al anterior">
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
    <Card title="Cambios fuera de lo normal" hint="Calculado con reglas simples sobre tu propia actividad">
      <div className="cq-momentum" data-tone={tone}>
        <Sparkline series={metrics.series.views} tone={tone} height={44} />
        <span className="cq-badge" data-tone={metrics.momentum}>
          {MOMENTUM_LABEL[metrics.momentum]}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>{MOMENTUM_COPY[metrics.momentum]}</p>
      <div className="cq-kpis" style={{ gridTemplateColumns: "repeat(2, minmax(0,1fr))" }}>
        <div className="cq-kpi">
          <span className="cq-kpi__label">Mejor día</span>
          <span className="cq-kpi__value" style={{ fontSize: 18 }}>
            {metrics.records.bestDayValue}
          </span>
          <span className="cq-card__hint">{metrics.records.bestDayLabel ?? "—"}</span>
        </div>
        <div className="cq-kpi">
          <span className="cq-kpi__label">Promedio diario</span>
          <span className="cq-kpi__value" style={{ fontSize: 18 }}>
            {decimalEs(metrics.records.averageDailyValue, 1)}
          </span>
          <span className="cq-card__hint">Hoy: {metrics.records.todayValue}</span>
        </div>
      </div>
    </Card>
  );
}

export function GoalsWidget({ goals }: { goals: SmartGoalV1[] }) {
  return (
    <Card title="Tus metas" hint="Metas calculadas a partir de tu propia historia">
      <div style={{ display: "grid", gap: 10 }}>
        {goals.map((goal) => (
          <div className="cq-goal" key={goal.id}>
            <div className="cq-goal__head">
              <strong style={{ fontSize: 13 }}>{goal.label}</strong>
              <span className="cq-badge" data-tone={goal.status}>
                {GOAL_STATUS_LABEL[goal.status]}
              </span>
            </div>
            {goal.status !== "learning" ? (
              <div className="cq-goal__body">
                <ProgressRing
                  value={goal.progress}
                  tone={goal.status === "behind" ? "danger" : goal.status === "at_risk" ? "warning" : "positive"}
                  caption={`Avance de ${goal.label.toLowerCase()}`}
                />
                <div style={{ minWidth: 0, flex: 1, display: "grid", gap: 6 }}>
                  <span className="cq-bar__track">
                    <span className="cq-bar__fill" style={{ width: `${Math.round(goal.progress * 100)}%` }} />
                  </span>
                  <span className="cq-card__hint">
                    {goal.current} de {goal.target} · proyección {goal.projected} · quedan {goal.daysRemaining} días
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

export function LiveActivityWidget({
  events,
  now,
}: {
  events: AnalyticsEventV1[];
  now: Date;
}) {
  return (
    <Card
      title="Actividad reciente"
      hint="Lo más reciente que ocurrió en tu página"
      actions={<span className="cq-pulse" aria-hidden="true" />}
    >
      <div className="cq-feed" role="log" aria-live="polite">
        {events.length === 0 ? <p className="cq-empty">Todavía no hay actividad</p> : null}
        {events.slice(0, 12).map((event) => (
          <div className="cq-feed__row" key={event.id}>
            <span>
              {EVENT_COPY[event.eventType] ?? event.eventType}
              {event.linkLabel ? ` · ${event.linkLabel}` : ""}
            </span>
            <span className="cq-feed__time">{relativeTimeEs(event.timestamp, now)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
