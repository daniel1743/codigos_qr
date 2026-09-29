import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, ArrowLeft, Eye, MousePointerClick } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import "../components/intelligent-analytics/analytics.css";
import { AppShell } from "../components/app-shell/AppShell";
import { CqStatusPill } from "../components/cq-ui/CqStatusPill";
import { Button } from "../components/ui/button";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import {
  ANALYTICS_SCENARIOS,
  AnalyticsDashboard,
  buildScenarioEvents,
  inferAvailability,
  type AnalyticsEventV1,
  type RealDataAvailabilityV1,
  type ScenarioId,
} from "../components/intelligent-analytics";
import type { PlanId } from "../components/intelligent-analytics/analytics.types";
import { getAnalyticsEffectiveTierFn } from "../lib/billing/analytics-entitlement-server";
import { analyticsService } from "../services/analyticsService";
import { analyticsRealDataService, realDataPeriodBounds } from "../services/analyticsRealDataService";
import { pageService } from "../services/page.service";
import type { Page } from "../types/database";
import type { PageAnalyticsSummary } from "../types/analytics";

export const Route = createFileRoute("/pages/$pageId/analytics")({ component: PageAnalytics });

const EMPTY: PageAnalyticsSummary = {
  visits: 0,
  buttonClicks: 0,
  whatsappClicks: 0,
  productClicks: 0,
  serviceClicks: 0,
  topProducts: [],
  topServices: [],
  dailyVisits: [],
};

function MetricCard({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-cq-lg bg-cq-blue-50 p-4 sm:rounded-cq-xl sm:p-5">
      <div className="min-w-0">
        <p className="text-[12.5px] font-medium text-cq-muted">{label}</p>
        <p className="mt-1.5 text-[26px] font-semibold leading-none tracking-[-0.03em] text-cq-ink tabular-nums">
          {value.toLocaleString("es-CL")}
        </p>
      </div>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-cq-blue shadow-soft">
        {icon}
      </span>
    </div>
  );
}

function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-cq-lg border border-cq-line bg-white p-4 shadow-soft sm:rounded-cq-xl sm:p-5 ${className ?? ""}`}
    >
      <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-cq-ink">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

type AnalyticsMode = "fixtures" | "real" | "legacy";

function initialMode(): AnalyticsMode {
  if (!import.meta.env.DEV) return "legacy";
  const param =
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("analytics");
  if (param === "legacy") return "legacy";
  if (param === "real") return "real";
  return "fixtures";
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
  const timezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || qaTimezone;
    } catch {
      return qaTimezone;
    }
  }, []);

  const isLegacy = mode === "legacy";

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
          const analytics = await analyticsService.getPageAnalytics(supabase, pageId, days);
          if (active) setSummary(analytics);
        } else if (mode === "real") {
          const bounds = realDataPeriodBounds("90d", new Date(), timezone);
          const result = await analyticsRealDataService.getRealPageEvents(supabase, pageId, bounds);
          if (active) {
            setRealEvents(result.events);
            setRealRows(result.rows);
            setRealTruncated(result.truncated);
            setRealAvailability(inferAvailability(result.events));
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
      <main className="mx-auto w-full max-w-cq-page px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pt-10">
        <Button asChild variant="ghost" size="sm" className="rounded-full">
          <Link to="/pages">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver a mis páginas
          </Link>
        </Button>

        {loading ? (
          <p className="mt-6 text-[13.5px] text-cq-muted">Cargando estadísticas…</p>
        ) : error || !page ? (
          <section className="mt-6 rounded-cq-lg border border-cq-line bg-white p-8 text-center text-[13.5px] shadow-soft sm:rounded-cq-xl">
            <p className="text-destructive">{error ?? "No se encontró esta página."}</p>
          </section>
        ) : (
          <>
            <header className="mt-6 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-cq-subtle">
                {days === 1 ? "Hoy" : `Últimos ${days} días`}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                <h1 className="flex items-center gap-2 text-[26px] font-bold leading-none tracking-[-0.035em] text-cq-ink sm:text-[34px]">
                  <BarChart3 className="h-6 w-6 text-cq-blue" /> Estadísticas
                </h1>
                <CqStatusPill
                  tone={page.published ? "positive" : "neutral"}
                  label={page.published ? "Publicada" : "Borrador"}
                />
              </div>
              <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-cq-muted">{page.title}</p>
            </header>

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
                className="mt-6 flex flex-wrap items-center gap-2 rounded-cq-lg border border-cq-line bg-white p-2 shadow-soft sm:rounded-cq-xl"
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
                          ? "rounded-full bg-cq-blue px-3.5 py-1.5 text-[13px] font-semibold text-white shadow-soft"
                          : "rounded-full bg-cq-blue-50 px-3.5 py-1.5 text-[13px] font-semibold text-cq-muted transition-colors hover:text-cq-ink"
                      }
                    >
                      {range === 1 ? "Hoy" : `Últimos ${range} días`}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {mode === "legacy" ? (
              <section
                className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                aria-label="Resumen"
              >
                <MetricCard
                  label="Visitas"
                  value={summary.visits}
                  icon={<Eye className="h-5 w-5" />}
                />
                <MetricCard
                  label="Clics en botones"
                  value={summary.buttonClicks}
                  icon={<MousePointerClick className="h-5 w-5" />}
                />
                <MetricCard
                  label="Clics en WhatsApp"
                  value={summary.whatsappClicks}
                  icon={<span className="text-sm font-bold">WA</span>}
                />
                <MetricCard
                  label="Interés en productos/servicios"
                  value={summary.productClicks + summary.serviceClicks}
                  icon={
                    <span className="text-sm font-bold">
                      {summary.productClicks + summary.serviceClicks}
                    </span>
                  }
                />
              </section>
            ) : null}

            {mode === "legacy" && !hasEvents ? (
              <section className="mt-6 rounded-cq-lg border border-dashed border-cq-blue-200 bg-cq-blue-50/60 p-6 text-center sm:rounded-cq-xl">
                <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-cq-ink">
                  Todavía no hay visitas
                </h3>
                <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-cq-muted">
                  Comparte tu página o tu QR y aquí podrás ver cómo interactúan las personas.
                </p>
              </section>
            ) : mode === "legacy" ? (
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <Panel title="Visitas por día">
                  <div className="space-y-2">
                    {summary.dailyVisits.map((item) => (
                      <div key={item.date} className="flex items-center justify-between text-[13px]">
                        <span className="text-cq-muted">{item.date}</span>
                        <span className="font-semibold text-cq-ink tabular-nums">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </Panel>
                {summary.topProducts.length > 0 || summary.topServices.length > 0 ? (
                  <Panel title="Interés por producto o servicio">
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
                  </Panel>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </main>
    </AppShell>
  );
}
