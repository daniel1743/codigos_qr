import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "../components/app-shell/AppShell";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import { pageService } from "../services/page.service";
import type { Page } from "../types/database";

const PAGE_TYPE_LABELS: Record<string, string> = {
  landing: "Landing",
  promotion: "Promoción",
  menu: "Menú",
  campaign: "Campaña",
  event: "Evento",
};

export const Route = createFileRoute("/pages/$pageId")({ component: PageDetail });

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PageDetail() {
  const { pageId } = Route.useParams();
  const supabase = getBrowserSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<Page | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) return;
        const loaded = await pageService.getOwnPageById(supabase, pageId, auth.user.id);
        setPage(loaded);
        if (!loaded) setNotFound(true);
      } catch (err) {
        console.error("Error loading page detail:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [pageId]);

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link to="/pages">
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver a mis páginas
            </Link>
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : notFound || !page ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-sm text-muted-foreground">
                No se encontró esta página o no tienes acceso a ella.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <header className="flex items-center justify-between gap-4 border-b border-border pb-6">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{page.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {PAGE_TYPE_LABELS[page.page_type] ?? page.page_type}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Button asChild variant="outline">
                  <Link to="/pages/$pageId/edit" params={{ pageId: page.id }}>
                    Editar con Power
                  </Link>
                </Button>
                <Badge variant={page.published ? "default" : "secondary"}>
                  {page.published ? "Publicada" : "Borrador"}
                </Badge>
              </div>
            </header>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Detalles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Título</span>
                  <span className="font-medium">{page.title}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Objetivo</span>
                  <span className="font-medium">
                    {PAGE_TYPE_LABELS[page.page_type] ?? page.page_type}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">ID público</span>
                  <span className="font-mono text-sm font-medium">{page.public_id}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Estado</span>
                  <span className="font-medium">
                    {page.published ? "Publicada" : "Borrador"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Creada</span>
                  <span className="font-medium">{formatDate(page.created_at)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Actualizada</span>
                  <span className="font-medium">{formatDate(page.updated_at)}</span>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </AppShell>
  );
}
