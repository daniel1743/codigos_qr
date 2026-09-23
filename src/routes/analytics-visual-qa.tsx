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
 * DEV-ONLY QA seam for C2B6 component-specific visual evidence.
 *
 * Renders the Intelligent Analytics dashboard against a deterministic fixture
 * scenario and plan, without touching Supabase, authentication, billing or any
 * storage. Mirrors `power-editor-phase4-qa`: unreachable in production
 * (`import.meta.env.DEV` + `notFound()`), absent from navigation, `noindex`.
 *
 * `?surface=notifications` renders the Notification Center in its OPEN state
 * directly (SSR), because client hydration/interactivity is unavailable in this
 * dev sandbox — this keeps the visual evidence deterministic without clicks.
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
    title: "Your audience shows up at a specific time",
    message: "11:00–12:00 is your busiest window. Publish and share around then.",
    severity: "important",
    score: 78,
    scoreParts: { importance: 70, anomaly: 40, confidence: 98, relevance: 80, novelty: 60 },
    createdAt: "2026-09-22T14:30:00.000Z",
    read: false,
    dismissed: false,
    action: { type: "open_analytics", label: "See hot hours" },
    metric: { label: "Peak window", value: "11:00–12:00" },
  },
  {
    id: "qa-nc-2",
    type: "channel_spike",
    kind: "positive",
    icon: "📈",
    title: "WhatsApp is heating up",
    message: "WhatsApp clicks grew +79% this period.",
    severity: "notable",
    score: 64,
    scoreParts: { importance: 60, anomaly: 70, confidence: 96, relevance: 75, novelty: 50 },
    createdAt: "2026-09-22T13:10:00.000Z",
    read: true,
    dismissed: false,
    channel: "whatsapp",
    metric: { label: "WhatsApp", value: "100 clicks" },
  },
  {
    id: "qa-nc-3",
    type: "goal_at_risk",
    kind: "goal",
    icon: "🎯",
    title: "Your monthly views goal needs a push",
    message: "418 to go with 9 days left.",
    severity: "critical",
    score: 88,
    scoreParts: { importance: 90, anomaly: 50, confidence: 78, relevance: 90, novelty: 60 },
    createdAt: "2026-09-22T12:00:00.000Z",
    read: false,
    dismissed: false,
    action: { type: "upgrade", label: "Improve your page" },
    metric: { label: "Remaining", value: "418" },
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
      { title: "Analytics Visual QA | Cripqer" },
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
          displayName: "QA Visual Profile",
          plan,
          availableChannels: [...AVAILABLE_CHANNELS],
          timezone: QA_TIMEZONE,
          timezoneLabel: QA_TIMEZONE,
          now: QA_NOW,
        }}
        slot={
          <div className="cq-qa-banner" role="status">
            <strong>QA fixtures</strong> · {scenario} · plan {plan} · deterministic (no database, no
            auth)
          </div>
        }
      />
    </div>
  );
}
