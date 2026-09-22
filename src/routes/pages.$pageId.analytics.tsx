import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, ArrowLeft, Eye, MousePointerClick } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import "../components/intelligent-analytics/analytics.css";
import { AppShell } from "../components/app-shell/AppShell";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
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
    <Card>
      <CardContent className="flex items-center justify-between gap-4 py-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">
            {value.toLocaleString("es-CL")}
          </p>
        </div>
        <div className="rounded-full bg-primary/10 p-3 text-primary">{icon}</div>
      </CardContent>
    </Card>
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
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
        <Button asChild variant="ghost" size="sm" className="mb-6">
          <Link to="/pages">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver a mis páginas
          </Link>
        </Button>

        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando estadísticas…</p>
        ) : error || !page ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-destructive">
              {error ?? "No se encontró esta página."}
            </CardContent>
          </Card>
        ) : (
          <>
            <header className="flex flex-col gap-3 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                  <BarChart3 className="h-6 w-6" /> Estadísticas
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">{page.title}</p>
              </div>
              <Badge variant={page.published ? "default" : "secondary"}>
                {page.published ? "Publicada" : "Borrador"}
              </Badge>
            </header>

            {import.meta.env.DEV ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-3 text-sm">
                <span className="font-medium">Analytics QA</span>
                <Button
                  size="sm"
                  variant={mode === "fixtures" ? "default" : "outline"}
                  onClick={() => setMode("fixtures")}
                >
                  Fixtures
                </Button>
                <Button
                  size="sm"
                  variant={mode === "real" ? "default" : "outline"}
                  onClick={() => setMode("real")}
                >
                  Datos reales
                </Button>
                <Button
                  size="sm"
                  variant={mode === "legacy" ? "default" : "outline"}
                  onClick={() => setMode("legacy")}
                >
                  Dashboard anterior
                </Button>
                {mode === "fixtures" ? (
                  <label className="flex items-center gap-2">
                    Escenario
                    <select
                      aria-label="Escenario de analytics"
                      className="rounded-md border border-border bg-background px-2 py-1"
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
              <div className="mt-6 flex flex-wrap gap-2" aria-label="Periodo de estadísticas">
                {[1, 7, 30].map((range) => (
                  <Button
                    key={range}
                    size="sm"
                    variant={days === range ? "default" : "outline"}
                    onClick={() => setDays(range)}
                  >
                    {range === 1 ? "Hoy" : `Últimos ${range} días`}
                  </Button>
                ))}
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
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Todavía no hay visitas</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Comparte tu página o tu QR y aquí podrás ver cómo interactúan las personas.
                </CardContent>
              </Card>
            ) : mode === "legacy" ? (
              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Visitas por día</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {summary.dailyVisits.map((item) => (
                      <div key={item.date} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{item.date}</span>
                        <span className="font-medium">{item.count}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                {(summary.topProducts.length > 0 || summary.topServices.length > 0) && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Interés por producto o servicio</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                      {summary.topProducts.length > 0 && (
                        <div>
                          <p className="mb-2 font-medium">Productos</p>
                          {summary.topProducts.map((item) => (
                            <div
                              key={`product-${item.label}`}
                              className="flex justify-between gap-4 py-1"
                            >
                              <span className="text-muted-foreground">{item.label}</span>
                              <span>{item.count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {summary.topServices.length > 0 && (
                        <div>
                          <p className="mb-2 font-medium">Servicios</p>
                          {summary.topServices.map((item) => (
                            <div
                              key={`service-${item.label}`}
                              className="flex justify-between gap-4 py-1"
                            >
                              <span className="text-muted-foreground">{item.label}</span>
                              <span>{item.count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : null}
          </>
        )}
      </main>
    </AppShell>
  );
}
