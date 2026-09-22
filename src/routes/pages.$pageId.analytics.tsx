import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, ArrowLeft, Eye, MousePointerClick } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AppShell } from "../components/app-shell/AppShell";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import { analyticsService } from "../services/analyticsService";
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

function PageAnalytics() {
  const { pageId } = Route.useParams();
  const [page, setPage] = useState<Page | null>(null);
  const [summary, setSummary] = useState<PageAnalyticsSummary>(EMPTY);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const supabase = getBrowserSupabaseClient();
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) throw new Error("Debes iniciar sesión para ver estadísticas.");
        const ownedPage = await pageService.getOwnPageById(supabase, pageId, auth.user.id);
        if (!ownedPage) throw new Error("No se encontró esta página o no tienes acceso a ella.");
        const analytics = await analyticsService.getPageAnalytics(supabase, pageId, days);
        if (!active) return;
        setPage(ownedPage);
        setSummary(analytics);
        setError(null);
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
  }, [pageId, days]);

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

            <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Resumen">
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

            {!hasEvents ? (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Todavía no hay visitas</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Comparte tu página o tu QR y aquí podrás ver cómo interactúan las personas.
                </CardContent>
              </Card>
            ) : (
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
            )}
          </>
        )}
      </main>
    </AppShell>
  );
}
