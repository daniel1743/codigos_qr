import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, ArrowLeft, Eye, MousePointerClick } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  isAnalyticsDashboardRealModeEnabled,
  resolveAnalyticsDashboardMode,
  type AnalyticsDashboardMode,
} from "../lib/analytics";

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

/**
 * Estado seguro y fijo cuando la ruta se abre sin sesión.
 * Es además el ÚNICO error que ofrece la acción de iniciar sesión.
 */
const AUTH_REQUIRED_MESSAGE = "Debes iniciar sesión para ver estadísticas.";

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

type AnalyticsMode = AnalyticsDashboardMode;

/**
 * C2B8 canary gate.
 *
 * DEV keeps the QA selector (`?analytics=…`, fixtures by default). In production
 * the mode starts as `pending` and is decided ONCE after the owner-scoped page
 * row loads (canary gate on `public_id`), never from the URL; anything else
 * falls back to `legacy`.
 */
function initialMode(): AnalyticsMode {
  return resolveAnalyticsDashboardMode({
    isDev: import.meta.env.DEV,
    search: typeof window === "undefined" ? null : window.location.search,
  });
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
  const [realError, setRealError] = useState<string | null>(null);
  /** The production canary verdict is decided once per mount (rollback-safe). */
  const canaryResolved = useRef(false);
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

  const needsTier = mode === "fixtures" || mode === "real";

  useEffect(() => {
    let active = true;
    // A failed load (no session, no access, transport error) must also end the
    // `pending` canary state, otherwise the screen hangs on "Cargando…" forever.
    let failed = false;
    (async () => {
      try {
        const supabase = getBrowserSupabaseClient();
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) throw new Error(AUTH_REQUIRED_MESSAGE);
        const ownedPage = await pageService.getOwnPageById(supabase, pageId, auth.user.id);
        if (!ownedPage) throw new Error("No se encontró esta página o no tienes acceso a ella.");
        if (!active) return;
        setPage(ownedPage);

        // C2B8: in production the canary gate decides real vs legacy ONCE, from
        // the owner-scoped page row (`public_id`) — never from the query string.
        if (!import.meta.env.DEV && !canaryResolved.current) {
          canaryResolved.current = true;
          const resolved = resolveAnalyticsDashboardMode({
            isDev: false,
            page: { publicId: ownedPage.public_id },
            realModeEnabled: isAnalyticsDashboardRealModeEnabled({
              supabaseUrl: import.meta.env["VITE_SUPABASE_URL"],
              publicId: ownedPage.public_id,
              environment: import.meta.env,
            }),
          });
          if (active) setMode(resolved);
        }

        if (mode === "legacy") {
          const analytics = await analyticsService.getPageAnalytics(supabase, pageId, days);
          if (active) setSummary(analytics);
        } else if (mode === "real") {
          // A V1.1 failure must never break the page: degrade to a controlled
          // state that offers the legacy dashboard as fallback.
          try {
            const bounds = realDataPeriodBounds("90d", new Date(), timezone);
            const result = await analyticsRealDataService.getRealPageEvents(
              supabase,
              pageId,
              bounds,
            );
            if (active) {
              setRealEvents(result.events);
              setRealRows(result.rows);
              setRealTruncated(result.truncated);
              setRealAvailability(inferAvailability(result.events));
              setRealError(null);
            }
          } catch (reason) {
            if (active) {
              setRealEvents([]);
              setRealRows(0);
              setRealTruncated(false);
              setRealError(
                reason instanceof Error
                  ? reason.message
                  : "No pudimos cargar tus estadísticas.",
              );
            }
          }
        }
        if (active) setError(null);
      } catch (reason) {
        failed = true;
        if (active)
          setError(
            reason instanceof Error ? reason.message : "No se pudieron cargar las estadísticas.",
          );
      } finally {
        // `pending` mantiene el estado de carga hasta que el gate del canary se
        // resuelve; un fallo termina esa espera en el estado de error seguro.
        if (active && (failed || mode !== "pending")) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [pageId, days, mode, timezone]);

  useEffect(() => {
    if (!needsTier) {
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
  }, [needsTier]);

  const hasEvents = summary.visits + summary.buttonClicks > 0;

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
        <Button asChild variant="ghost" size="sm" className="mb-6">
          <Link to="/pages">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver a mis páginas
          </Link>
        </Button>

        {loading || (mode === "pending" && !error) ? (
          <p className="text-sm text-muted-foreground">Cargando estadísticas…</p>
        ) : error || !page ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-destructive">
              <p>{error ?? "No se encontró esta página."}</p>
              {error === AUTH_REQUIRED_MESSAGE ? (
                <Button asChild size="sm" className="mt-4">
                  <Link to="/login">Iniciar sesión</Link>
                </Button>
              ) : null}
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
                <span className="font-medium">QA de estadísticas</span>
                <Button
                  size="sm"
                  variant={mode === "fixtures" ? "default" : "outline"}
                  onClick={() => setMode("fixtures")}
                >
                  Datos de prueba
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
                      <strong>Datos de prueba</strong> · {fixture} · zona horaria {qaTimezone} · plan {plan}
                      {billingStatus === "fallback"
                        ? " · sin datos de facturación: se aplicó el plan Gratis"
                        : ""}
                    </div>
                  }
                />
              </div>
            ) : null}

            {mode === "real" && realError ? (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>No pudimos cargar tus estadísticas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <p>{realError}</p>
                  <p>Puedes seguir viendo el resumen anterior mientras lo revisamos.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRealError(null);
                      setMode("legacy");
                    }}
                  >
                    Ver dashboard anterior
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            {mode === "real" && !realError ? (
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
                      <strong>Datos reales · solo lectura</strong> · {realRows} registros cargados
                      (últimos 90 días)
                      {realTruncated ? " · llegamos al límite de lectura" : " · ventana completa"}
                      {" · visitas con sesión identificada: "}
                      {realAvailability.sessionTracking ? "sí" : "no"}
                      {billingStatus === "fallback"
                        ? " · sin datos de facturación: se aplicó el plan Gratis"
                        : ""}
                    </div>
                  }
                />
              </div>
            ) : null}

            {mode === "legacy" ? (
              <div className="mt-6 flex flex-wrap gap-2" aria-label="Período de estadísticas">
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
