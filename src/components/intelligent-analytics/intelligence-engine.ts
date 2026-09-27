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
import { GOAL_NOUN, METRIC_COPY, conversionPer100, decimalEs, rateEs } from "./copy.es-419";

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
      title: "Todavía estamos conociendo a tus visitantes",
      message:
        sampleSize === 0
          ? "En este período todavía no registramos actividad en tu página. Comparte tu página o tu QR para empezar a ver qué pasa."
          : `Ya registramos ${metrics.totals.views} visitas y ${metrics.totals.interactions} acciones. Todavía necesitamos un poco más de actividad para detectar patrones con suficiente confianza.`,
      severity: "info",
      confidence: 0.4,
      metrics: [{ label: METRIC_COPY.views.primary, value: String(metrics.totals.views) }],
      action: { type: "none", label: "Seguir compartiendo tu página" },
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
        title: "Recibiste más visitas que en el período anterior",
        message: `Tus visitas aumentaron ${fmtPct(viewDelta)} frente al período anterior (${metrics.comparisons.views.current} frente a ${metrics.comparisons.views.previous}).`,
        severity: viewDelta >= 60 ? "important" : "notable",
        confidence: confidenceFor(sampleSize, viewDelta),
        metrics: [
          { label: METRIC_COPY.views.primary, value: String(metrics.totals.views) },
          { label: "Variación", value: fmtPct(viewDelta) },
        ],
        action: { type: "open_analytics", label: "Ver qué cambió" },
      });
    } else if (viewDelta <= -25) {
      drafts.push({
        type: "traffic_drop",
        category: "warning",
        title: "Tus visitas bajaron frente al período anterior",
        message: `Tus visitas bajaron ${Math.abs(Math.round(viewDelta))}% frente al período anterior. Puede ser buen momento para volver a compartir tu página o tu QR.`,
        severity: viewDelta <= -50 ? "important" : "notable",
        confidence: confidenceFor(sampleSize, viewDelta),
        metrics: [
          { label: METRIC_COPY.views.primary, value: String(metrics.totals.views) },
          { label: "Variación", value: fmtPct(viewDelta) },
        ],
        action: { type: "open_editor", label: "Renovar tu página", target: "page" },
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
        title: `${leader.label} es el canal que más acciones recibe`,
        message: `${Math.round(leader.share * 100)}% de las acciones en tus enlaces van a ${leader.label}. Vale la pena darle el lugar más visible de tu página.`,
        severity: "notable",
        confidence: confidenceFor(sampleSize, leader.share * 100),
        metrics: [
          { label: "Acciones", value: String(leader.clicks) },
          { label: "Parte del total", value: `${Math.round(leader.share * 100)}%` },
        ],
        channel: leader.channel,
        action: { type: "open_editor", label: `Destacar ${leader.label}`, target: "channel", targetId: leader.channel },
      });
    }
    for (const channel of metrics.channels) {
      if (channel.deltaPct !== null && channel.deltaPct >= 60 && channel.clicks >= 8) {
        drafts.push({
          type: "channel_spike",
          category: "positive",
          title: `${channel.label} está generando más interés`,
          message: `Las acciones en ${channel.label} crecieron ${fmtPct(channel.deltaPct)} en este período (${channel.clicks} acciones).`,
          severity: "notable",
          confidence: confidenceFor(sampleSize, channel.deltaPct),
          metrics: [
            { label: channel.label, value: String(channel.clicks) },
            { label: "Variación", value: fmtPct(channel.deltaPct) },
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
      title: improving
        ? "Ahora tus visitantes hacen más acciones"
        : "Bajaron las acciones por visita",
      message: improving
        ? `Tus visitantes pasaron a hacer ${decimalEs(metrics.interactionRate)} acciones por visita (${fmtPct(ctrDelta)}). Sea lo que sea que cambiaste, vale la pena mantenerlo.`
        : `Las acciones por visita bajaron a ${decimalEs(metrics.interactionRate)} (${fmtPct(ctrDelta)}). Un botón principal más claro suele recuperar este número.`,
      severity: improving ? "notable" : "important",
      confidence: confidenceFor(sampleSize, ctrDelta),
      metrics: [
        {
          label: `${METRIC_COPY.interactionsPerView.primary} ${METRIC_COPY.interactionsPerView.technical}`,
          value: `${decimalEs(metrics.interactionRate)}\u00d7`,
        },
        { label: "Variación", value: fmtPct(ctrDelta) },
      ],
      action: improving
        ? { type: "open_analytics", label: "Ver el detalle de las acciones" }
        : { type: "open_editor", label: "Mejorar tu botón principal", target: "cta" },
    });
  }

  /* Conversion ---------------------------------------------------------- */
  const conversionDelta = metrics.comparisons.conversion.deltaPct;
  if (metrics.totals.leads > 0 && conversionDelta !== null && Math.abs(conversionDelta) >= 25) {
    const improving = conversionDelta > 0;
    drafts.push({
      type: improving ? "conversion_improvement" : "conversion_deterioration",
      category: improving ? "positive" : "warning",
      title: improving
        ? "Se generan más contactos por visita"
        : "Bajaron los contactos generados",
      message: `Se generaron alrededor de ${Math.round(metrics.conversionRate * 100)} contactos por cada 100 visitas (conversión: ${rateEs(metrics.conversionRate)}, ${fmtPct(conversionDelta)} frente al período anterior).`,
      severity: improving ? "notable" : "important",
      confidence: confidenceFor(sampleSize, conversionDelta),
      metrics: [
        { label: METRIC_COPY.conversion.primary, value: conversionPer100(metrics.conversionRate) },
        { label: "Contactos", value: String(metrics.totals.leads) },
      ],
    });
  }

  /* Records --------------------------------------------------------------- */
  const { records } = metrics;
  if (records.todayValue > 0 && records.todayValue >= records.bestDayValue) {
    drafts.push({
      type: "new_daily_record",
      category: "record",
      title: "Hoy es tu mejor día hasta ahora",
      message: `Hoy registraste ${records.todayValue} visitas: es tu día con más actividad hasta ahora.`,
      severity: "important",
      confidence: 0.9,
      metrics: [{ label: "Visitas de hoy", value: String(records.todayValue) }],
    });
  } else if (records.bestDayValue > 0 && records.todayValue >= records.bestDayValue * 0.8) {
    drafts.push({
      type: "near_daily_record",
      category: "record",
      title: "Estás cerca de tu mejor día",
      message: `Hoy llevas ${records.todayValue} visitas y tu mejor día registrado tiene ${records.bestDayValue}.`,
      severity: "notable",
      confidence: 0.75,
      metrics: [
        { label: "Hoy", value: String(records.todayValue) },
        { label: "Mejor día", value: String(records.bestDayValue) },
      ],
    });
  }

  /* Timing ---------------------------------------------------------------- */
  if (metrics.bestHour && metrics.bestHour.value >= 5) {
    drafts.push({
      type: "best_hour",
      category: "opportunity",
      title: "Tus visitantes se conectan a una hora parecida",
      message: `Entre ${hourWindow(metrics.bestHour.hour)} está tu mayor actividad. Puede ser buen momento para compartir tu página.`,
      severity: "notable",
      confidence: confidenceFor(sampleSize, metrics.bestHour.value),
      metrics: [
        { label: "Horario con más actividad", value: hourWindow(metrics.bestHour.hour) },
        { label: "Actividad registrada", value: String(metrics.bestHour.value) },
      ],
    });
  }

  /* Links ------------------------------------------------------------------ */
  const topLink = metrics.topLinks[0];
  if (topLink && topLink.deltaPct !== null && topLink.deltaPct >= 50 && topLink.value >= 6) {
    drafts.push({
      type: "top_link_emerging",
      category: "opportunity",
      title: `"${topLink.label}" está llamando más la atención`,
      message: `Ese enlace creció ${fmtPct(topLink.deltaPct)} en este período. Subirlo en tu página suele aumentar todavía más las acciones.`,
      severity: "notable",
      confidence: confidenceFor(sampleSize, topLink.deltaPct),
      metrics: [
        { label: "Acciones", value: String(topLink.value) },
        { label: "Variación", value: fmtPct(topLink.deltaPct) },
      ],
      action: { type: "open_editor", label: "Subirlo en tu página", target: "link", targetId: topLink.id },
    });
  }
  const weakest = metrics.topLinks[metrics.topLinks.length - 1];
  if (metrics.topLinks.length >= 4 && weakest && weakest.share < 0.03 && metrics.totals.views >= 40) {
    drafts.push({
      type: "underperforming_link",
      category: "opportunity",
      title: `"${weakest.label}" casi no recibe acciones`,
      message: `Ocupa espacio en tu página y reúne solo ${Math.round(weakest.share * 100)}% de las acciones. Puedes cambiarle el texto o quitarlo.`,
      severity: "info",
      confidence: confidenceFor(sampleSize, 20),
      metrics: [{ label: "Acciones", value: String(weakest.value) }],
      action: { type: "open_editor", label: "Revisar este enlace", target: "link", targetId: weakest.id },
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
        title: `Ahora mismo ${spike.label} está recibiendo más acciones`,
        message: `Registramos ${spike.clicks} acciones hacia ${spike.label} durante los últimos ${spike.windowMinutes} minutos. Es ${decimalEs(spike.ratio, 1)}\u00d7 tu actividad habitual.`,
        severity: spike.ratio >= 3 ? "important" : "notable",
        confidence: spike.confidence,
        metrics: [
          { label: "Acciones", value: String(spike.clicks) },
          { label: "Frente a lo habitual", value: `${decimalEs(spike.ratio, 1)}\u00d7` },
          { label: "Últimos minutos", value: `${spike.windowMinutes} min` },
        ],
        channel: spike.channel,
        action: { type: "open_analytics", label: "Ver la actividad" },
      });
    }
    const hour = rolling.windows.find((entry) => entry.windowMinutes === 60);
    if (!spike && hour && hour.ratio !== null && hour.ratio >= 2 && hour.total >= 10) {
      drafts.push({
        type: "realtime_surge",
        category: "realtime",
        title: "Hay más actividad que de costumbre en tu página",
        message: `${hour.total} registros de actividad en la última hora, ${decimalEs(hour.ratio, 1)}\u00d7 tu ritmo habitual para este horario.`,
        severity: "notable",
        confidence: 0.72,
        metrics: [
          { label: "Última hora", value: String(hour.total) },
          { label: "Frente a lo habitual", value: `${decimalEs(hour.ratio, 1)}\u00d7` },
        ],
        action: { type: "open_analytics", label: "Ver la actividad" },
      });
    }
  }

  /* Weekly record ----------------------------------------------------- */
  const thisWeek = records.thisWeekValue ?? 0;
  if (thisWeek > 0 && records.bestWeekValue > 0 && thisWeek >= records.bestWeekValue) {
    drafts.push({
      type: "new_weekly_record",
      category: "record",
      title: "Tu mejor semana hasta ahora",
      message: `Esta semana ya llegó a ${thisWeek} visitas \u2014 es tu semana con más actividad registrada.`,
      severity: "important",
      confidence: 0.88,
      metrics: [
        { label: "Esta semana", value: String(thisWeek) },
        { label: "Mejor semana anterior", value: String(records.bestWeekValue) },
      ],
      action: { type: "open_analytics", label: "Ver el detalle" },
    });
  }

  /* Hot time window --------------------------------------------------- */
  if (metrics.bestHour && metrics.bestHour.value >= 8 && metrics.totals.views > 0) {
    const share = metrics.bestHour.value / Math.max(metrics.totals.views, 1);
    if (share >= 0.12) {
      drafts.push({
        type: "hot_time_window",
        category: "opportunity",
        title: "Hay un horario que funciona mejor que el resto",
        message: `Cerca del ${Math.round(share * 100)}% de la actividad ocurre alrededor de ${hourWindow(metrics.bestHour.hour)}. Compartir justo antes de ese horario suele dar mejores resultados.`,
        severity: "notable",
        confidence: confidenceFor(sampleSize, share * 100),
        metrics: [
          { label: "Horario con más actividad", value: hourWindow(metrics.bestHour.hour) },
          { label: "Parte del total", value: `${Math.round(share * 100)}%` },
        ],
        action: { type: "open_analytics", label: "Ver las horas con más actividad" },
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
        title: "Estás cerca de tu meta del mes",
        message: `Te faltan ${remaining} ${GOAL_NOUN[goal.metric]} para llegar a tu meta de ${goal.target}.`,
        severity: "notable",
        confidence: 0.75,
        metrics: [
          { label: "Avance", value: `${Math.round(goal.progress * 100)}%` },
          { label: "Te falta", value: String(remaining) },
        ],
        action: { type: "open_analytics", label: "Ver el detalle" },
      });
    } else if (goal.status === "on_track" && goal.progress < 1) {
      drafts.push({
        type: "goal_projected_success",
        category: "goal",
        title: "Vas bien encaminado para cumplir tu meta del mes",
        message: `Si mantienes el ritmo actual, la proyección es ${goal.projected} ${GOAL_NOUN[goal.metric]} y tu meta es ${goal.target}.`,
        severity: "notable",
        confidence: 0.8,
        metrics: [
          { label: "Proyección", value: String(goal.projected) },
          { label: "Meta", value: String(goal.target) },
        ],
        action: { type: "open_analytics", label: "Ver el detalle" },
      });
    } else if (goal.status === "at_risk" || goal.status === "behind") {
      drafts.push({
        type: "goal_at_risk",
        category: "goal",
        title: "Tu meta del mes necesita un empujón",
        message: `Te faltan ${remaining} ${GOAL_NOUN[goal.metric]} y quedan ${goal.daysRemaining} días: necesitas alrededor de ${goal.requiredPerDay} por día para llegar.`,
        severity: goal.status === "behind" ? "important" : "notable",
        confidence: 0.78,
        metrics: [
          { label: "Te falta", value: String(remaining) },
          { label: "Por día", value: String(goal.requiredPerDay) },
        ],
        action: { type: "open_editor", label: "Mejorar tu página", target: "page" },
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
