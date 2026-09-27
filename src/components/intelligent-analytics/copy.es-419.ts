/**
 * CRIPQER INTELLIGENT ANALYTICS V1.1 — C2B8A · vocabulario visible en español latino (es-419).
 *
 * Un solo lugar para el idioma de Intelligent Analytics. Regla de producto:
 *
 *   1. Qué pasó          → lenguaje humano, sin jerga.
 *   2. Qué significa     → explicación breve.
 *   3. Qué podría hacer  → recomendación, solo cuando es confiable.
 *   4. Término técnico   → opcional, entre paréntesis, como segunda capa.
 *
 * Este módulo es SOLO presentación. No cambia cálculos, eventos, planes, gates
 * ni contratos: los motores siguen entregando exactamente los mismos números y
 * los mismos `id` canónicos, y aquí solo se decide cómo se muestran.
 *
 * Regla de verdad (ver C2B8A): nunca se afirma más de lo que la señal permite.
 * Un clic en WhatsApp no es un mensaje enviado; una visita no es una persona.
 */

import type {
  AnalyticsEventV1,
  GoalStatus,
  InsightSeverity,
  MomentumStateV1,
  PeriodId,
  PlanId,
  RankedItemV1,
  RollingWindowAnalyticsV1,
} from "./analytics.types";

/* ------------------------------------------------------------------ */
/* 1. Períodos                                                         */
/* ------------------------------------------------------------------ */

export const PERIOD_LABEL: Record<PeriodId, string> = {
  today: "Hoy",
  "7d": "7 días",
  "30d": "30 días",
  "90d": "90 días",
  custom: "Período personalizado",
};

export const GRANULARITY_LABEL: Record<"hour" | "day", string> = {
  hour: "cada hora",
  day: "cada día",
};

/* ------------------------------------------------------------------ */
/* 2. Métricas — capa humana + término técnico secundario              */
/* ------------------------------------------------------------------ */

export const METRIC_COPY = {
  views: { primary: "Visitas", technical: "(vistas)" },
  qrScans: { primary: "Visitas desde tu QR", technical: "(escaneos de QR)" },
  interactions: { primary: "Acciones realizadas", technical: "(interacciones)" },
  interactionsPerView: { primary: "Acciones por visita", technical: "(interacciones por visita)" },
  conversion: { primary: "Personas que completaron una acción", technical: "(conversión)" },
  liveActivity: { primary: "Actividad reciente", technical: "(últimos 60 minutos)" },
  visitors: { primary: "Personas distintas que visitaron", technical: "(visitantes únicos)" },
} as const;

/* ------------------------------------------------------------------ */
/* 3. Planes                                                           */
/* ------------------------------------------------------------------ */

export const PLAN_NAME: Record<PlanId, string> = {
  free: "Gratis",
  pro: "Pro",
  business: "Business",
  enterprise: "Enterprise",
};

/** "Available on Pro" → "Disponible con Pro" */
export function planLockReason(plan: PlanId): string {
  return `Disponible con ${PLAN_NAME[plan]}`;
}

/** "Upgrade to pro" → "Ver plan Pro" */
export function upgradeCta(plan: PlanId): string {
  return `Ver plan ${PLAN_NAME[plan]}`;
}

/** Qué valor aporta el widget bloqueado, sin prometer de más. */
export function lockedWidgetValue(plan: PlanId): string {
  return `Esta información está disponible en el plan ${PLAN_NAME[plan]}.`;
}

/** Sin números de ejemplo: cuando el plan lo incluya, serán solo datos reales. */
export const LOCKED_WIDGET_HONESTY =
  "Cuando esté disponible en tu plan, verás únicamente tus datos reales.";

/* ------------------------------------------------------------------ */
/* 4. Actividad reciente (copy de eventos, nunca de clientes)          */
/* ------------------------------------------------------------------ */

export const EVENT_COPY: Partial<Record<AnalyticsEventV1["eventType"], string>> = {
  page_view: "Visita a la página",
  smart_page_view: "Visita a la página",
  qr_scan: "Entrada desde QR",
  link_click: "Abrió un enlace",
  whatsapp_click: "Entró a WhatsApp",
  instagram_click: "Entró a Instagram",
  facebook_click: "Entró a Facebook",
  tiktok_click: "Entró a TikTok",
  youtube_click: "Entró a YouTube",
  linkedin_click: "Entró a LinkedIn",
  external_link_click: "Abrió un enlace",
  cta_click: "Tocó el botón principal",
  lead_created: "Dejó sus datos",
  share: "Compartió la página",
  return_visit: "Volvió a visitar la página",
  session_start: "Nueva visita",
};

/* ------------------------------------------------------------------ */
/* 5. Tiempo relativo                                                  */
/* ------------------------------------------------------------------ */

export function relativeTimeEs(timestamp: string, now: Date): string {
  const diff = now.getTime() - Date.parse(timestamp);
  if (!Number.isFinite(diff)) return "";
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "hace un momento";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "hace 1 día" : `hace ${days} días`;
}

/* ------------------------------------------------------------------ */
/* 6. Días de la semana (lunes = 0, igual que HourCellV1.weekday)      */
/* ------------------------------------------------------------------ */

export const WEEKDAY_SHORT: readonly string[] = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/* ------------------------------------------------------------------ */
/* 7. Estados y etiquetas de estado                                    */
/* ------------------------------------------------------------------ */

export const MOMENTUM_LABEL: Record<MomentumStateV1, string> = {
  strong_growth: "Crecimiento fuerte",
  growing: "Creciendo",
  stable: "Estable",
  declining: "Bajando",
  unusual_activity: "Cambio fuera de lo normal",
};

export const MOMENTUM_COPY: Record<MomentumStateV1, string> = {
  strong_growth: "Tu página está creciendo con claridad frente al período anterior.",
  growing: "Tus visitas suben de forma sostenida frente al período anterior.",
  stable: "Tu actividad se mantiene estable, sin cambios importantes.",
  declining: "Tus visitas están bajando. Puede ser buen momento para volver a compartir tu página.",
  unusual_activity: "Hoy la actividad fue distinta a lo que suele ocurrir en tu página.",
};

export const ROLLING_STATE_COPY: Record<RollingWindowAnalyticsV1["state"], string> = {
  quiet: "No hubo actividad durante la última hora.",
  normal: "La actividad va a tu ritmo habitual.",
  rising: "La actividad está subiendo frente a tu ritmo habitual.",
  spike: "Ahora mismo hay más actividad de lo normal en tu página.",
};

export const GOAL_STATUS_LABEL: Record<GoalStatus, string> = {
  learning: "Todavía sin datos suficientes",
  on_track: "Vas bien encaminado",
  at_risk: "Necesita un empujón",
  achieved: "Meta cumplida",
  behind: "Vas por debajo",
};

export const SEVERITY_LABEL: Record<InsightSeverity, string> = {
  info: "Informativo",
  notable: "A tener en cuenta",
  important: "Importante",
  critical: "Urgente",
};

/* ------------------------------------------------------------------ */
/* 8. Dispositivos, origen de visitas y embudo (por id canónico)        */
/* ------------------------------------------------------------------ */
/* Los motores siguen entregando sus etiquetas canónicas en inglés      */
/* ("Mobile", "Direct", "QR scan"…). Aquí solo se traduce cómo se       */
/* muestran, siempre por `id` estable y nunca por texto.                */

const DEVICE_LABEL: Record<string, string> = {
  mobile: "Celular",
  desktop: "Computador",
  tablet: "Tablet",
  unknown: "Sin identificar",
};

const SOURCE_LABEL: Record<string, string> = {
  qr: "Desde tu QR",
  direct: "Escribieron la dirección o la tenían guardada",
  referrer: "Llegaron desde otra página",
};

const FUNNEL_LABEL: Record<string, string> = {
  qr_scan: "Entraron desde tu QR",
  page_view: "Vieron tu página",
  interaction: "Hicieron una acción",
  channel_action: "Dejaron sus datos",
};

/** Dispositivos: "Mobile" → "Celular". Solo cambia el texto visible. */
export function devicesEs(items: RankedItemV1[]): RankedItemV1[] {
  return items.map((item) => {
    const label = DEVICE_LABEL[item.id];
    return label ? { ...item, label } : item;
  });
}

/**
 * Origen de las visitas: "Direct" → "Escribieron la dirección…".
 * Una campaña UTM conserva su nombre (es dato del usuario) y solo se
 * reescribe el prefijo técnico.
 */
export function sourcesEs(items: RankedItemV1[]): RankedItemV1[] {
  return items.map((item) => {
    const label = SOURCE_LABEL[item.id];
    if (label) return { ...item, label };
    if (item.id.startsWith("utm:")) return { ...item, label: `Campaña · ${item.id.slice(4)}` };
    return item;
  });
}

/** Pasos del embudo: "Page view" → "Vieron tu página". */
export function funnelEs<T extends { id: string; label: string }>(steps: T[]): T[] {
  return steps.map((step) => {
    const label = FUNNEL_LABEL[step.id];
    return label ? { ...step, label } : step;
  });
}

/* ------------------------------------------------------------------ */
/* 9. Números en formato latino (coma decimal)                          */
/* ------------------------------------------------------------------ */

/** 0.25 → "0,25". Cambia el formato visible, nunca el valor. */
export function decimalEs(value: number, digits = 2): string {
  return value.toFixed(digits).replace(".", ",");
}

/** 0.123 → "12,3%". */
export function rateEs(ratio: number, digits = 1): string {
  return `${decimalEs(ratio * 100, digits)}%`;
}

/* ------------------------------------------------------------------ */
/* 10. Encabezado del dashboard                                         */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* 11. Metas: sustantivo humano por métrica                             */
/* ------------------------------------------------------------------ */

export const GOAL_NOUN: Record<"views" | "interactions" | "leads", string> = {
  views: "visitas",
  interactions: "acciones",
  leads: "contactos",
};

export const LEARNING_HEADLINE = "Cripqer todavía está conociendo a tus visitantes";

export function greeting(name: string): string {
  return `Hola ${name} — `;
}

export function liveLastHourUnit(count: number): string {
  return count === 1 ? "acción en la última hora" : "acciones en la última hora";
}

export function liveLastHour(count: number): string {
  return `${count} ${liveLastHourUnit(count)}`;
}
