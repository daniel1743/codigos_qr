import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { ANALYTICS_SCENARIOS, buildScenarioEvents } from "./analytics.fixtures";
import {
  EVENT_COPY,
  GOAL_STATUS_LABEL,
  METRIC_COPY,
  MOMENTUM_COPY,
  MOMENTUM_LABEL,
  ROLLING_STATE_COPY,
  conversionPer100,
  decimalEs,
  devicesEs,
  funnelEs,
  rateEs,
  relativeTimeEs,
  sourcesEs,
} from "./copy.es-419";
import type { AnalyticsMetricsV1 } from "./analytics.types";
import { buildDailyBrief } from "./daily-brief";
import { generateSmartGoals } from "./goals-engine";
import { generateInsights } from "./intelligence-engine";
import { computeMetrics, resolveRange } from "./metrics-engine";
import { computeRollingWindow } from "./rolling-window";
import { resolveWidgets } from "./widget-registry";

/**
 * C2B8A — Español latino + lenguaje humano.
 *
 * This suite is the executable contract of the phase:
 *
 *   · LANG-01/02  no user-visible English and no jargon as the primary layer;
 *   · LANG-03     technical terms survive ONLY as a secondary, parenthesised layer;
 *   · SEM-01..04  translating never changes what a metric means or measures;
 *   · VER-01      no synthetic numbers: learning copy quotes real counters only;
 *   · TRU-01      honest wording: a WhatsApp click is never "a message sent".
 *
 * It works on the pure engines, so it proves the language layer without
 * rendering React and without touching any calculation.
 */

const NOW = new Date("2026-09-22T15:00:00.000Z");
const TZ = "America/Santiago";

/**
 * Tokens that must never appear in the FIRST layer of the experience.
 * Brand names (WhatsApp, Instagram…) and Spanish words are obviously absent:
 * every hit is therefore real leftover English or jargon.
 */
const JARGON_OR_ENGLISH = [
  "activity",
  "anomalies",
  "anomaly",
  "attribution",
  "audience",
  "available",
  "baseline",
  "channel",
  "channels",
  "click",
  "clicks",
  "conversion rate",
  "cooldown",
  "ctr",
  "daily",
  "data",
  "devices",
  "dismiss",
  "engagement",
  "funnel",
  "geography",
  "goal",
  "goals",
  "hourly",
  "hours",
  "insight",
  "insights",
  "interactions",
  "kpi",
  "leads",
  "link",
  "links",
  "minutes",
  "momentum",
  "notification",
  "notifications",
  "page",
  "performance",
  "progress",
  "projected",
  "quota",
  "record",
  "records",
  "remaining",
  "session",
  "sessions",
  "share",
  "shared",
  "signal",
  "signals",
  "spike",
  "target",
  "threshold",
  "today",
  "traffic",
  "trend",
  "unique users",
  "unique visitors",
  "unlock",
  "upgrade",
  "usual",
  "view",
  "views",
  "week",
  "weekly",
  "window",
  "windows",
  "yesterday",
] as const;

/** Claims nobody can make from a click, a view or a session. */
const FALSE_CLAIMS = [
  "envió un mensaje",
  "envió mensaje",
  "escribió por whatsapp",
  "te escribió",
  "habló contigo",
  "compró",
  "realizó una compra",
  "venta confirmada",
  "cliente nuevo",
] as const;

/** Strings that already shipped in English in C2B8 and must not come back. */
const RESIDUAL_ENGLISH = [
  "Analytics QA",
  "Baseline still building",
  "Channel performance",
  "Cripqer intelligence",
  "Conversion funnel",
  "Daily brief",
  "Dismiss notification",
  'title="Geography"',
  "Hot hours",
  "Intelligent Analytics",
  "Live activity",
  "Mark all read",
  "Momentum & anomalies",
  "Most recent signals",
  "No activity yet",
  "No data yet",
  "Nothing to show yet",
  "Page view",
  "Performance trend",
  "Period comparison",
  "Right now",
  "Smart goals",
  "Top links",
  "Traffic sources",
  "Unlock this view",
  "Upgrade to",
  "You're all caught up",
  "no live socket is claimed",
  "session_id",
] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Every forbidden token found in `value`, case-insensitive and word-bounded. */
function jargonHits(value: string): string[] {
  const text = value.toLowerCase();
  return JARGON_OR_ENGLISH.filter((token) =>
    new RegExp(`(?<![a-záéíóúñü])${escapeRegExp(token)}(?![a-záéíóúñü])`).test(text),
  );
}

function expectHuman(value: string, origin: string): void {
  expect(jargonHits(value), `${origin} → "${value}"`).toEqual([]);
}

function expectNoFalseClaim(value: string, origin: string): void {
  const text = value.toLowerCase();
  const found = FALSE_CLAIMS.filter((claim) => text.includes(claim));
  expect(found, `${origin} → "${value}"`).toEqual([]);
}

/* ------------------------------------------------------------------ */
/* Corpora: every visible engine output, for every scenario             */
/* ------------------------------------------------------------------ */

type ScenarioKey = (typeof ANALYTICS_SCENARIOS)[number]["id"];
type Plan = "free" | "pro" | "business" | "enterprise";

interface Corpus {
  scenario: string;
  strings: string[];
}

function corpusFor(scenarioId: ScenarioKey, plan: Plan): Corpus {
  const events = buildScenarioEvents(scenarioId, NOW, "owned-profile");
  const range = resolveRange("30d", NOW, TZ);
  const metrics = computeMetrics({ events, range, now: NOW, timezone: TZ });
  const rolling = computeRollingWindow({ events, now: NOW, timezone: TZ });
  const goals = generateSmartGoals(metrics, NOW, TZ);
  const insights = generateInsights(metrics, { rolling, goals });
  const brief = buildDailyBrief(metrics, insights, goals, NOW);
  const widgets = resolveWidgets(metrics, plan);

  return {
    scenario: scenarioId,
    strings: [
      ...widgets.map((widget) => widget.title),
      ...widgets.map((widget) => widget.reason).filter((reason) => reason.length > 0),
      ...insights.map((insight) => insight.title),
      ...insights.map((insight) => insight.message),
      ...insights.flatMap((insight) => insight.metrics.map((metric) => metric.label)),
      ...insights.flatMap((insight) => (insight.action ? [insight.action.label] : [])),
      brief.headline,
      ...brief.paragraphs,
      ...brief.bullets.map((bullet) => bullet.label),
      ...goals.map((goal) => goal.label),
      ...goals.map((goal) => goal.message),
      ...goals.map((goal) => GOAL_STATUS_LABEL[goal.status]),
    ],
  };
}

const CORPORA: Corpus[] = [
  ...ANALYTICS_SCENARIOS.map((scenario) => corpusFor(scenario.id, "free")),
  corpusFor("growing_business", "business"),
  corpusFor("whatsapp_heavy", "pro"),
];

function copyValues(record: Record<string, string>): string[] {
  return Object.values(record);
}

/* ------------------------------------------------------------------ */
/* LANG-01 / LANG-02 / LANG-03                                         */
/* ------------------------------------------------------------------ */

describe("C2B8A · LANG-01/02 — ni inglés ni jerga como primera capa", () => {
  it("los motores solo producen lenguaje humano en español", () => {
    for (const corpus of CORPORA) {
      for (const value of corpus.strings) expectHuman(value, `corpus:${corpus.scenario}`);
    }
  });

  it("las etiquetas estáticas (métricas, actividad, estados) están en español", () => {
    for (const value of copyValues(METRIC_COPY.views)) expectHuman(value, "METRIC_COPY.views");
    for (const value of copyValues(METRIC_COPY.qrScans)) expectHuman(value, "METRIC_COPY.qrScans");
    for (const value of copyValues(METRIC_COPY.interactions)) {
      expectHuman(value, "METRIC_COPY.interactions");
    }
    for (const value of copyValues(METRIC_COPY.interactionsPerView)) {
      expectHuman(value, "METRIC_COPY.interactionsPerView");
    }
    for (const value of copyValues(METRIC_COPY.conversion)) {
      expectHuman(value, "METRIC_COPY.conversion");
    }
    for (const value of copyValues(METRIC_COPY.liveActivity)) {
      expectHuman(value, "METRIC_COPY.liveActivity");
    }
    for (const value of copyValues(METRIC_COPY.visitors)) {
      expectHuman(value, "METRIC_COPY.visitors");
    }
    for (const value of copyValues(MOMENTUM_LABEL)) expectHuman(value, "MOMENTUM_LABEL");
    for (const value of copyValues(MOMENTUM_COPY)) expectHuman(value, "MOMENTUM_COPY");
    for (const value of copyValues(ROLLING_STATE_COPY)) expectHuman(value, "ROLLING_STATE_COPY");
    for (const value of copyValues(GOAL_STATUS_LABEL)) expectHuman(value, "GOAL_STATUS_LABEL");
    for (const value of copyValues(EVENT_COPY as Record<string, string>)) {
      expectHuman(value, "EVENT_COPY");
    }
  });

  it("LANG-03 — el término técnico solo vive como segunda capa entre paréntesis", () => {
    expect(METRIC_COPY.views.technical).toBe("(vistas)");
    expect(METRIC_COPY.qrScans.technical).toBe("(escaneos de QR)");
    expect(METRIC_COPY.interactions.technical).toBe("(interacciones)");
    expect(METRIC_COPY.interactionsPerView.technical).toBe("(interacciones por visita)");
    expect(METRIC_COPY.conversion.technical).toBe("(conversión)");
    for (const metric of Object.values(METRIC_COPY)) {
      expect(metric.technical.startsWith("("), metric.technical).toBe(true);
      expect(metric.technical.endsWith(")"), metric.technical).toBe(true);
    }
  });
});

/* ------------------------------------------------------------------ */
/* SEM — el texto nunca cambia el significado de la métrica            */
/* ------------------------------------------------------------------ */

describe("C2B8A · SEM — traducir no cambia el significado", () => {
  it("SEM-01 — Visitas son visitas, no personas", () => {
    expect(METRIC_COPY.views.primary).toBe("Visitas");
    expect(METRIC_COPY.views.primary.toLowerCase()).not.toContain("personas");
    expect(METRIC_COPY.visitors.primary).toBe("Visitas identificadas");
    expect(METRIC_COPY.visitors.primary).not.toBe(METRIC_COPY.views.primary);
    expect(METRIC_COPY.visitors.technical).toBe("(sesiones distintas)");
  });

  it("SEM-02 — WhatsApp se describe como entrada, nunca como mensaje", () => {
    expect(EVENT_COPY.whatsapp_click).toBe("Entró a WhatsApp");
    expect(String(EVENT_COPY.whatsapp_click).toLowerCase()).not.toContain("mensaje");
  });

  it("SEM-03 — las acciones no se presentan como personas únicas", () => {
    expect(METRIC_COPY.interactions.primary).toBe("Acciones");
    expect(METRIC_COPY.interactions.primary.toLowerCase()).not.toContain("personas");
    expect(METRIC_COPY.interactionsPerView.primary).toBe("Acciones por visita");
  });

  it("SEM-04 — conversión conserva el contrato actual", () => {
    expect(METRIC_COPY.conversion.primary).toBe("Contactos por cada 100 visitas");
    expect(METRIC_COPY.conversion.technical).toBe("(conversión)");
    // La misma conversión, en dos unidades de presentación (mismo cálculo).
    expect(conversionPer100(0.048)).toBe("4,8");
    expect(rateEs(0.048)).toBe("4,8%");
  });

  it("traducir etiquetas no toca ningún número", () => {
    const devices = [
      { id: "mobile", label: "Mobile", value: 7, previousValue: 3, deltaPct: 133, share: 0.5 },
    ];
    expect(devicesEs(devices)[0]).toMatchObject({
      id: "mobile",
      label: "Celular",
      value: 7,
      previousValue: 3,
      deltaPct: 133,
      share: 0.5,
    });

    const sources = [
      { id: "direct", label: "Direct", value: 4, previousValue: 1, deltaPct: 300, share: 0.4 },
      {
        id: "utm:promo",
        label: "Campaign · promo",
        value: 2,
        previousValue: 0,
        deltaPct: null,
        share: 0.2,
      },
    ];
    const localized = sourcesEs(sources);
    expect(localized[0]).toMatchObject({
      label: "Escribieron la dirección o la tenían guardada",
      value: 4,
      share: 0.4,
    });
    expect(localized[1]).toMatchObject({ label: "Campaña · promo", value: 2, share: 0.2 });

    const funnel = [{ id: "page_view", label: "Page view", value: 9, stepRate: 0.5, dropOff: 9 }];
    expect(funnelEs(funnel)[0]).toMatchObject({
      label: "Vieron tu página",
      value: 9,
      stepRate: 0.5,
      dropOff: 9,
    });
  });

  it("el formato latino cambia la coma, no el valor", () => {
    expect(decimalEs(0.25)).toBe("0,25");
    expect(rateEs(0.123)).toBe("12,3%");
    expect(relativeTimeEs(new Date(NOW.getTime() - 20_000).toISOString(), NOW)).toBe(
      "hace un momento",
    );
    expect(relativeTimeEs(new Date(NOW.getTime() - 90_000).toISOString(), NOW)).toBe("hace 2 min");
    expect(relativeTimeEs(new Date(NOW.getTime() - 7_200_000).toISOString(), NOW)).toBe("hace 2 h");
    expect(relativeTimeEs(new Date(NOW.getTime() - 172_800_000).toISOString(), NOW)).toBe(
      "hace 2 días",
    );
  });
});

/* ------------------------------------------------------------------ */
/* VER / TRU — honestidad con pocos datos y con los clics              */
/* ------------------------------------------------------------------ */

describe("C2B8A · VER/TRU — sin números sintéticos y sin promesas falsas", () => {
  it("VER-01 — el modo aprendizaje cita los contadores reales", () => {
    const events = buildScenarioEvents("no_data", NOW, "owned-profile");
    const range = resolveRange("30d", NOW, TZ);
    const metrics = computeMetrics({ events, range, now: NOW, timezone: TZ });
    const insights = generateInsights(metrics, {});
    const brief = buildDailyBrief(metrics, insights, [], NOW);

    expect(brief.state).toBe("learning");
    expect(brief.headline).toContain("conocer a tus visitantes");

    const text = brief.paragraphs.join(" ");
    expect(text).toContain(String(metrics.totals.views));
    expect(text).toContain(String(metrics.totals.interactions));
    expect(text.toLowerCase()).not.toContain("baseline");
    expect(jargonHits(text)).toEqual([]);
  });

  it("TRU-01 — ningún texto afirma mensajes, compras ni clientes", () => {
    for (const value of copyValues(EVENT_COPY as Record<string, string>)) {
      expectNoFalseClaim(value, "EVENT_COPY");
    }
    for (const corpus of CORPORA) {
      for (const value of corpus.strings) expectNoFalseClaim(value, `corpus:${corpus.scenario}`);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Guardia de código: el inglés de C2B8 no puede volver                */
/* ------------------------------------------------------------------ */

describe("C2B8A · LANG-01 — guardia contra inglés residual en el código", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const read = (file: string) => readFileSync(resolve(here, file), "utf8");

  const presentation = [
    "components/widgets.tsx",
    "components/charts.tsx",
    "components/AnalyticsDashboard.tsx",
    "components/NotificationCenter.tsx",
    "components/NotificationToasts.tsx",
  ];

  it("la capa de presentación está limpia", () => {
    for (const file of presentation) {
      const content = read(file);
      for (const phrase of RESIDUAL_ENGLISH) {
        expect(content.includes(phrase), `${file} todavía contiene "${phrase}"`).toBe(false);
      }
    }
  });

  it("la ruta de Analytics está limpia", () => {
    const route = read("../../routes/pages.$pageId.analytics.tsx");
    for (const phrase of ["Analytics QA", "Intelligent Analytics", "session_id", "QA fixtures"]) {
      expect(route.includes(phrase), `route todavía contiene "${phrase}"`).toBe(false);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Round 1 — unidad real y sin conclusiones de sesión                   */
/* ------------------------------------------------------------------ */

/** Base calculada UNA sola vez: variar contadores no debe recalcular el fixture. */
const READY_BASE: AnalyticsMetricsV1 = (() => {
  const events = buildScenarioEvents("growing_business", NOW, "owned-profile");
  return computeMetrics({ events, range: resolveRange("30d", NOW, TZ), now: NOW, timezone: TZ });
})();

/** Métricas listas (sampleSize sobre el umbral) con los contadores indicados. */
function readyMetrics(
  views: number,
  deltaPct: number | null,
  interactions: number,
  leads: number,
): AnalyticsMetricsV1 {
  const previous = deltaPct === null ? 0 : Math.max(Math.round(views / (1 + deltaPct / 100)), 0);
  return {
    ...READY_BASE,
    totals: { ...READY_BASE.totals, views, interactions, leads },
    comparisons: { ...READY_BASE.comparisons, views: { current: views, previous, deltaPct } },
  };
}

function briefText(metrics: AnalyticsMetricsV1): string {
  return buildDailyBrief(metrics, [], [], NOW).paragraphs.join(" ");
}

describe("C2B8A · Round 1 — unidad real, sin equiparar eventos con personas", () => {
  it("ninguna etiqueta de métrica habla de personas", () => {
    for (const metric of Object.values(METRIC_COPY)) {
      expect(metric.primary.toLowerCase(), metric.primary).not.toContain("persona");
      expect(metric.technical.toLowerCase(), metric.technical).not.toContain("persona");
    }
  });

  it("los motores no hablan de personas en métricas de vista o sesión", () => {
    for (const corpus of CORPORA) {
      for (const value of corpus.strings) {
        expect(value.toLowerCase(), `${corpus.scenario}: ${value}`).not.toContain("persona");
      }
    }
  });

  it("el resumen se adapta a crecimiento, caída, igualdad, sin comparación y cero", () => {
    const growth = briefText(readyMetrics(875, 68, 308, 42));
    expect(growth).toContain(
      "Tu página sigue creciendo: 875 visitas, un 68% más que en el período anterior.",
    );
    expect(growth).toContain("Se registraron 308 acciones y 42 contactos.");

    const decline = briefText(readyMetrics(400, -24, 120, 0));
    expect(decline).toContain("menos visitas: 400 visitas, un 24% menos");
    expect(decline).toContain("y ningún contacto");

    const flat = briefText(readyMetrics(400, 0, 10, 2));
    expect(flat).toContain("se mantuvo igual: 400 visitas");

    const noComparison = briefText(readyMetrics(400, null, 10, 2));
    expect(noComparison).toContain("todavía no hay un período anterior");

    const zero = briefText(readyMetrics(0, 0, 0, 0));
    expect(zero).toContain("no registramos visitas");
    expect(zero).toContain("No se registraron acciones ni contactos.");

    const single = briefText(readyMetrics(1, 10, 1, 1));
    expect(single).toContain("1 visita, un 10%");
    expect(single).toContain("1 acción");
    expect(single).toContain("1 contacto.");
  }, 30_000);

  it("no muestra un 0% artificial cuando falta el session_id (4B)", () => {
    const metrics: AnalyticsMetricsV1 = { ...readyMetrics(875, 68, 308, 42), actionRate: 0 };
    const text = briefText(metrics);
    expect(text).not.toContain("0%");
    expect(text.toLowerCase()).not.toContain("sesi");
    expect(text).not.toContain("hizo algo");
  }, 30_000);
});

