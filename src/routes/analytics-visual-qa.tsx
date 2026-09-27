import { createFileRoute, notFound } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  AnalyticsDashboard,
  buildScenarioEvents,
  type ScenarioId,
} from "../components/intelligent-analytics";
import { NotificationCenter } from "../components/intelligent-analytics/components/NotificationCenter";
import type {
  NotificationItemV1,
  PlanId,
} from "../components/intelligent-analytics/analytics.types";
import "../components/intelligent-analytics/analytics.css";

/**
 * Seam de QA visual SOLO-DEV para evidencia visual por componente (C2B6 / C2B8A).
 *
 * Renderiza el dashboard de Intelligent Analytics contra un escenario y un plan
 * fijos, sin tocar Supabase, autenticación, facturación ni ningún
 * almacenamiento. Igual que `power-editor-phase4-qa`: inalcanzable en producción
 * (`import.meta.env.DEV` + `notFound()`), fuera de la navegación, `noindex`.
 *
 * `?surface=notifications` renderiza el Centro de avisos ya ABIERTO
 * directamente (SSR), porque en este entorno de desarrollo no hay hidratación ni
 * interacción de cliente: así la evidencia visual es fija y no depende de clics.
 */
const QA_NOW = "2026-09-22T15:00:00.000Z";
const QA_TIMEZONE = "America/Santiago";
const QA_PROFILE_ID = "qa-visual-profile";

const SCENARIOS: ScenarioId[] = [
  "no_data",
  "new_user",
  "growing_business",
  "declining_business",
  "viral_spike",
  "whatsapp_heavy",
  "rolling_instagram_spike",
  "goal_at_risk",
  "goal_success_projection",
  "hot_window",
  "weekly_record",
];

const PLANS: PlanId[] = ["free", "pro", "business", "enterprise"];

const AVAILABLE_CHANNELS = [
  "whatsapp",
  "instagram",
  "facebook",
  "tiktok",
  "youtube",
  "linkedin",
  "other",
] as const;

const SAMPLE_NOTIFICATIONS: NotificationItemV1[] = [
  {
    id: "qa-nc-1",
    type: "best_hour",
    kind: "opportunity",
    icon: "💡",
    title: "Tus visitantes se conectan a una hora parecida",
    message: "Entre 11:00 y 12:00 está tu mayor actividad: puede ser buen momento para publicar o compartir.",
    severity: "important",
    score: 78,
    scoreParts: { importance: 70, anomaly: 40, confidence: 98, relevance: 80, novelty: 60 },
    createdAt: "2026-09-22T14:30:00.000Z",
    read: false,
    dismissed: false,
    action: { type: "open_analytics", label: "Ver las horas con más actividad" },
    metric: { label: "Horario con más actividad", value: "11:00–12:00" },
  },
  {
    id: "qa-nc-2",
    type: "channel_spike",
    kind: "positive",
    icon: "📈",
    title: "WhatsApp está generando más interés",
    message: "Las acciones en WhatsApp crecieron +79% este período.",
    severity: "notable",
    score: 64,
    scoreParts: { importance: 60, anomaly: 70, confidence: 96, relevance: 75, novelty: 50 },
    createdAt: "2026-09-22T13:10:00.000Z",
    read: true,
    dismissed: false,
    channel: "whatsapp",
    metric: { label: "WhatsApp", value: "100 acciones" },
  },
  {
    id: "qa-nc-3",
    type: "goal_at_risk",
    kind: "goal",
    icon: "🎯",
    title: "Tu meta de visitas del mes necesita un empujón",
    message: "Te faltan 418 visitas y quedan 9 días.",
    severity: "critical",
    score: 88,
    scoreParts: { importance: 90, anomaly: 50, confidence: 78, relevance: 90, novelty: 60 },
    createdAt: "2026-09-22T12:00:00.000Z",
    read: false,
    dismissed: false,
    action: { type: "upgrade", label: "Mejorar tu página" },
    metric: { label: "Te falta", value: "418" },
  },
];

const noop = () => {};

function NotificationsSurface() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--cq-bg, #ffffff)" }}>
      <NotificationCenter
        items={SAMPLE_NOTIFICATIONS}
        open
        onToggle={noop}
        onRead={noop}
        onDismiss={noop}
        onMarkAllRead={noop}
      />
    </div>
  );
}

export const Route = createFileRoute("/analytics-visual-qa")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  validateSearch: (search: Record<string, unknown>) => {
    const scenario = SCENARIOS.includes(search.scenario as ScenarioId)
      ? (search.scenario as ScenarioId)
      : "growing_business";
    const plan = PLANS.includes(search.plan as PlanId) ? (search.plan as PlanId) : "free";
    const surface = search.surface === "notifications" ? "notifications" : undefined;
    return { scenario, plan, surface };
  },
  head: () => ({
    meta: [
      { title: "QA visual de estadísticas | Cripqer" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
    ],
  }),
  component: AnalyticsVisualQaPage,
});

function AnalyticsVisualQaPage() {
  const { scenario, plan, surface } = Route.useSearch();
  const events = useMemo(
    () => buildScenarioEvents(scenario, new Date(QA_NOW), QA_PROFILE_ID),
    [scenario],
  );

  if (surface === "notifications") return <NotificationsSurface />;

  return (
    <div style={{ minHeight: "100vh", background: "var(--cq-bg, #ffffff)" }}>
      <AnalyticsDashboard
        events={events}
        context={{
          profileId: QA_PROFILE_ID,
          displayName: "Perfil de QA visual",
          plan,
          availableChannels: [...AVAILABLE_CHANNELS],
          timezone: QA_TIMEZONE,
          timezoneLabel: QA_TIMEZONE,
          now: QA_NOW,
        }}
        slot={
          <div className="cq-qa-banner" role="status">
            <strong>Datos de prueba</strong> · {scenario} · plan {plan} · datos fijos, sin base de
            datos ni login
          </div>
        }
      />
    </div>
  );
}
