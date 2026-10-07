import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, ArrowLeft, Eye, MousePointerClick } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import "../components/intelligent-analytics/analytics.css";
import { AppShell } from "../components/app-shell/AppShell";
import { CqEmptyState } from "../components/cq-ui/CqEmptyState";
import { CqPageHeader } from "../components/cq-ui/CqPageHeader";
import { CqPanel } from "../components/cq-ui/CqPanel";
import { CqStatusPill } from "../components/cq-ui/CqStatusPill";
import { Button } from "../components/ui/button";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import {
  ANALYTICS_SCENARIOS,
  AnalyticsDashboard,
  buildScenarioEvents,
  type AnalyticsEventV1,
  type RealDataAvailabilityV1,
  type ScenarioId,
} from "../components/intelligent-analytics";
import type { PlanId } from "../components/intelligent-analytics/analytics.types";
import { getAnalyticsEffectiveTierFn } from "../lib/billing/analytics-entitlement-server";
import {
  ANALYTICS_READ_TIMEZONE,
  analyticsPeriodFromDays,
  analyticsSummaryFromReadModel,
  readAnalyticsForPage,
} from "../services/analyticsRealDataService";
import { pageService } from "../services/page.service";
import { isCanonicalAnalyticsEnabled } from "../lib/analytics";
import type { Page } from "../types/database";
import type { PageAnalyticsSummary } from "../types/analytics";

export const Route = createFileRoute("/pages/$pageId/analytics")({ component: PageAnalytics });

const EMPTY: PageAnalyticsSummary = {
  visits: 0,
  sessions: 0,
  buttonClicks: 0,
  whatsappClicks: 0,
  productClicks: 0,
  serviceClicks: 0,
  topProducts: [],
  topServices: [],
  dailyVisits: [],
  truncated: false,
};

/**
 * KPI cell — same approved recipe as F3 `PerformancePanel` (value protagonist,
 * secondary label, no per-KPI card chrome). Presentation only.
 */
function KpiCell({ label, value, icon }: { label: string; value: number; icon?: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-[12.5px] font-medium text-cq-muted">
        {icon}
        {label}
      </dt>
      <dd className="mt-1.5 text-[26px] font-semibold leading-none tracking-[-0.03em] text-cq-ink tabular-nums">
        {value.toLocaleString("es-CL")}
      </dd>
    </div>
  );
}

const kpiIconClass = "h-3.5 w-3.5 shrink-0 text-cq-blue";

type AnalyticsMode = "fixtures" | "real" | "legacy";

function initialMode(): AnalyticsMode {
  // In DEV, honour the ?analytics= query param so QA can force any mode.
  if (import.meta.env.DEV) {
    const param =
      typeof window === "undefined"
        ? null
        : new URLSearchParams(window.location.search).get("analytics");
    if (param === "legacy") return "legacy";
    if (param === "real") return "real";
    return "fixtures";
  }
  // In production, start with "legacy" until the page loads and we can check
  // whether the canonical writer is active for this page (see the effect below).
  return "legacy";
}

function PageAnalytics() {
  const { pageId } = Route.useParams();
  const [page, setPage] = useState<Page | null>(null);
  const [summary, setSummary] = useState<PageAnalyticsSummary>(EMPTY);
  const [days, setDays] = useState(30);
  const [fixture, setFixture] = useState<ScenarioId>("growing_business");
  const [plan, setPlan] = useState<PlanId>("free");
  const [billingStatus, setBillingStatus] = useState<"loading" | "resolved" | "fallback">(
    "loading",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<AnalyticsMode>(initialMode);
  const [realEvents, setRealEvents] = useState<AnalyticsEventV1[]>([]);
  const [realRows, setRealRows] = useState(0);
  const [realTruncated, setRealTruncated] = useState(false);
  const [realAvailability, setRealAvailability] = useState<RealDataAvailabilityV1>({
    sessionTracking: false,
    qrProvenance: false,
    hasGeography: false,
    hasDevice: false,
    hasTrafficSource: false,
  });

  const qaNow = "2026-09-22T15:00:00.000Z";
  const qaTimezone = "America/Santiago";
  const timezone = ANALYTICS_READ_TIMEZONE;

  const isLegacy = mode === "legacy";

  // In production: once the page is loaded, switch to "real" mode automatically
  // if the canonical analytics writer is active for this page. In DEV the mode
  // is already set via query param (or defaults to "fixtures").
  useEffect(() => {
    if (import.meta.env.DEV || !page) return;
    const canonicalActive = isCanonicalAnalyticsEnabled({
      supabaseUrl: import.meta.env["VITE_SUPABASE_URL"],
      publicId: page.public_id,
      environment: import.meta.env as Record<string, unknown>,
    });
    setMode(canonicalActive ? "real" : "legacy");
  }, [page]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const supabase = getBrowserSupabaseClient();
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) throw new Error("Debes iniciar sesión para ver estadísticas.");
        const ownedPage = await pageService.getOwnPageById(supabase, pageId, auth.user.id);
        if (!ownedPage) throw new Error("No se encontró esta página o no tienes acceso a ella.");
        if (!active) return;
        setPage(ownedPage);

        if (mode === "legacy") {
          const model = await readAnalyticsForPage({
            supabase,
            pageId,
            period: analyticsPeriodFromDays(days),
            timezone,
          });
          if (active) setSummary(analyticsSummaryFromReadModel(model));
        } else if (mode === "real") {
          const model = await readAnalyticsForPage({
            supabase,
            pageId,
            period: "90d",
            timezone,
          });
          if (active) {
            setRealEvents(model.events);
            setRealRows(model.rows);
            setRealTruncated(model.truncated);
            setRealAvailability(model.availability);
          }
        }
        if (active) setError(null);
      } catch (reason) {
        if (active)
          setError(
            reason instanceof Error ? reason.message : "No se pudieron cargar las estadísticas.",
          );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [pageId, days, mode, timezone]);

  useEffect(() => {
    if (isLegacy) {
      setBillingStatus("resolved");
      return;
    }
    let active = true;
    void getAnalyticsEffectiveTierFn()
      .then((effectiveTier) => {
        if (!active) return;
        setPlan(effectiveTier);
        setBillingStatus("resolved");
      })
      .catch(() => {
        if (!active) return;
        setPlan("free");
        setBillingStatus("fallback");
      });
    return () => {
      active = false;
    };
  }, [isLegacy]);

  const hasEvents = summary.visits + summary.buttonClicks > 0;

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-cq-page px-4 pb-16 pt-8 sm:px-6 sm:pt-10 lg:px-10 lg:pt-14">
        <Button asChild variant="ghost" size="sm" className="rounded-full">
          <Link to="/pages">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver a mis páginas
          </Link>
        </Button>

        {loading ? (
          <p className="mt-8 text-[13.5px] text-cq-muted">Cargando estadísticas…</p>
        ) : error || !page ? (
          <section className="mt-8 rounded-cq-2xl border border-cq-line bg-white p-8 text-center text-[13.5px] shadow-soft">
            <p className="text-destructive">{error ?? "No se encontró esta página."}</p>
          </section>
        ) : (
          <>
            {/* Page header owns the title only for the legacy view. In fixtures/real the
                Intelligent Analytics dashboard renders its own header, so duplicating the
                title here would fight the Magic hierarchy. Presentation only. */}
            {mode === "legacy" ? (
              <div className="mt-8 min-w-0">
                <p className="text-[12.5px] font-semibold uppercase tracking-[0.16em] text-cq-blue">
                  {days === 1 ? "Hoy" : `Últimos ${days} días`}
                </p>
                <div className="mt-3">
                  <CqPageHeader
                    title="Analytics"
                    description="Entiende cómo las personas encuentran e interactúan con tu página."
                    visual="magic"
                    pill={
                      <CqStatusPill
                        tone={page.published ? "positive" : "neutral"}
                        label={page.published ? "Publicada" : "Borrador"}
                      />
                    }
                    context={page.title}
                  />
                </div>
              </div>
            ) : null}

            {mode === "legacy" && summary.truncated ? (
              <p className="mt-4 rounded-cq-lg bg-cq-blue-50 px-3 py-2 text-[12.5px] text-cq-muted">
                Datos parciales: se alcanzó el límite de lectura de Analytics.
              </p>
            ) : null}

            {import.meta.env.DEV ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-cq-lg border border-dashed border-cq-blue-200 bg-cq-blue-50/70 p-3 text-[13px]">
                <span className="font-semibold text-cq-ink">Analytics QA</span>
                <Button
                  size="sm"
                  className="rounded-full"
                  variant={mode === "fixtures" ? "default" : "outline"}
                  onClick={() => setMode("fixtures")}
                >
                  Fixtures
                </Button>
                <Button
                  size="sm"
                  className="rounded-full"
                  variant={mode === "real" ? "default" : "outline"}
                  onClick={() => setMode("real")}
                >
                  Datos reales
                </Button>
                <Button
                  size="sm"
                  className="rounded-full"
                  variant={mode === "legacy" ? "default" : "outline"}
                  onClick={() => setMode("legacy")}
                >
                  Dashboard anterior
                </Button>
                {mode === "fixtures" ? (
                  <label className="flex items-center gap-2 text-cq-muted">
                    Escenario
                    <select
                      aria-label="Escenario de analytics"
                      className="rounded-full border border-cq-line bg-white px-3 py-1.5 text-cq-ink"
                      value={fixture}
                      onChange={(event) => setFixture(event.target.value as ScenarioId)}
                    >
                      {ANALYTICS_SCENARIOS.map((scenario) => (
                        <option key={scenario.id} value={scenario.id}>
                          {scenario.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>
            ) : null}

            {mode === "fixtures" ? (
              <div className="mt-6">
                <AnalyticsDashboard
                  events={buildScenarioEvents(fixture, new Date(qaNow), page.profile_id)}
                  context={{
                    profileId: page.profile_id,
                    displayName: page.title,
                    plan,
                    availableChannels: [
                      "whatsapp",
                      "instagram",
                      "facebook",
                      "tiktok",
                      "youtube",
                      "linkedin",
                      "other",
                    ],
                    timezone: qaTimezone,
                    timezoneLabel: qaTimezone,
                    now: qaNow,
                  }}
                  slot={
                    <div className="cq-qa-banner" role="status">
                      <strong>QA fixtures</strong> · {fixture} · timezone {qaTimezone} · plan {plan}
                      {billingStatus === "fallback"
                        ? " · Billing no disponible, se aplicó fail-closed free"
                        : ""}
                    </div>
                  }
                />
              </div>
            ) : null}

            {mode === "real" ? (
              <div className="mt-6">
                <AnalyticsDashboard
                  events={realEvents}
                  availability={realAvailability}
                  context={{
                    profileId: page.profile_id,
                    displayName: page.title,
                    plan,
                    availableChannels: [
                      "whatsapp",
                      "instagram",
                      "facebook",
                      "tiktok",
                      "youtube",
                      "linkedin",
                      "other",
                    ],
                    timezone,
                    timezoneLabel: timezone,
                  }}
                  slot={
                    <div className="cq-qa-banner" role="status">
                      <strong>Datos reales · solo lectura</strong> · {realRows} eventos cargados
                      (máx. 90 días)
                      {realTruncated ? " · truncado al límite" : " · ventana completa"}
                      {" · session_id "}
                      {realAvailability.sessionTracking ? "disponible" : "no disponible"}
                      {billingStatus === "fallback"
                        ? " · Billing no disponible, se aplicó fail-closed free"
                        : ""}
                    </div>
                  }
                />
              </div>
            ) : null}

            {mode === "legacy" ? (
              <div
                className="mt-6 flex flex-wrap items-center gap-2 rounded-cq-2xl border border-cq-line bg-white p-2 shadow-soft"
                aria-label="Periodo de estadísticas"
              >
                <span
                  className="px-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-cq-subtle"
                  aria-hidden="true"
                >
                  Periodo
                </span>
                <div className="flex flex-wrap gap-2" role="group">
                  {[1, 7, 30].map((range) => (
                    <button
                      key={range}
                      type="button"
                      aria-pressed={days === range}
                      onClick={() => setDays(range)}
                      className={
                        days === range
                          ? "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-cq-xs bg-cq-blue px-3.5 text-[13px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(30,86,224,0.6)]"
                          : "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-cq-xs px-3.5 text-[13px] font-semibold text-cq-muted transition-colors hover:bg-cq-canvas hover:text-cq-ink"
                      }
                    >
                      {range === 1 ? "Hoy" : `Últimos ${range} días`}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {mode === "legacy" ? (
              <CqPanel
                visual="magic"
                headingId="analytics-summary-heading"
                title="Resumen"
                className="mt-6"
              >
                <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
                  <KpiCell
                    label="Visitas"
                    value={summary.visits}
                    icon={<Eye className={kpiIconClass} aria-hidden="true" />}
                  />
                  <KpiCell
                    label="Clics totales"
                    value={summary.buttonClicks}
                    icon={<MousePointerClick className={kpiIconClass} aria-hidden="true" />}
                  />
                  <KpiCell
                    label="Clics en WhatsApp"
                    value={summary.whatsappClicks}
                    icon={<span className="text-[11px] font-bold text-cq-blue">WA</span>}
                  />
                  {summary.productClicks + summary.serviceClicks > 0 ? (
                    <KpiCell
                      label="Interés en productos/servicios"
                      value={summary.productClicks + summary.serviceClicks}
                    />
                  ) : null}
                </dl>
              </CqPanel>
            ) : null}

            {mode === "legacy" && !hasEvents ? (
              <CqEmptyState
                className="mt-6"
                headingId="analytics-empty-heading"
                icon={<BarChart3 className="h-6 w-6" />}
                title="Todavía no hay visitas"
                description="Comparte tu página o tu QR y aquí podrás ver cómo interactúan las personas."
              />
            ) : mode === "legacy" ? (
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <CqPanel visual="magic" headingId="analytics-daily-heading" title="Visitas por día">
                  <ul className="divide-y divide-cq-line">
                    {summary.dailyVisits.map((item) => (
                      <li
                        key={item.date}
                        className="flex items-center justify-between gap-4 py-2.5 text-[13px] first:pt-0 last:pb-0"
                      >
                        <span className="text-cq-muted">{item.date}</span>
                        <span className="font-semibold text-cq-ink tabular-nums">{item.count}</span>
                      </li>
                    ))}
                  </ul>
                </CqPanel>
                {summary.topProducts.length > 0 || summary.topServices.length > 0 ? (
                  <CqPanel
                    visual="magic"
                    headingId="analytics-interest-heading"
                    title="Interés por producto o servicio"
                  >
                    <div className="space-y-4 text-[13px]">
                      {summary.topProducts.length > 0 ? (
                        <div>
                          <p className="mb-2 text-[12.5px] font-semibold uppercase tracking-[0.08em] text-cq-subtle">
                            Productos
                          </p>
                          {summary.topProducts.map((item) => (
                            <div
                              key={`product-${item.label}`}
                              className="flex justify-between gap-4 py-1"
                            >
                              <span className="text-cq-muted">{item.label}</span>
                              <span className="font-semibold text-cq-ink tabular-nums">
                                {item.count}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {summary.topServices.length > 0 ? (
                        <div>
                          <p className="mb-2 text-[12.5px] font-semibold uppercase tracking-[0.08em] text-cq-subtle">
                            Servicios
                          </p>
                          {summary.topServices.map((item) => (
                            <div
                              key={`service-${item.label}`}
                              className="flex justify-between gap-4 py-1"
                            >
                              <span className="text-cq-muted">{item.label}</span>
                              <span className="font-semibold text-cq-ink tabular-nums">
                                {item.count}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </CqPanel>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </main>
    </AppShell>
  );
}
