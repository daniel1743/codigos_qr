import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { AppShell } from "../components/app-shell/AppShell";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import { pageService } from "../services/page.service";
import { profileService } from "../services/profile.service";
import type { Page, Profile } from "../types/database";

const PAGE_TYPE_LABELS: Record<string, string> = {
  landing: "Landing",
  promotion: "Promoción",
  menu: "Menú",
  campaign: "Campaña",
  event: "Evento",
};

export const Route = createFileRoute("/pages")({ component: PagesList });

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function PagesList() {
  const supabase = getBrowserSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) return;
        const userId = auth.user.id;
        const currentProfile = await profileService.getProfileByUserId(supabase, userId);
        setProfile(currentProfile);
        const ownPages = await pageService.listOwnPages(supabase, userId, currentProfile?.id);
        setPages(ownPages);
      } catch (err) {
        console.error("Error loading pages:", err);
        setError("No se pudieron cargar tus páginas.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
        <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Mis páginas</h1>
            <p className="text-sm text-muted-foreground">
              Gestiona tu página principal y tus páginas adicionales.
            </p>
          </div>
          <Button asChild>
            <Link to="/pages/new">
              <Plus className="mr-2 h-4 w-4" /> Crear página
            </Link>
          </Button>
        </header>

        {loading ? (
          <p className="mt-6 text-sm text-muted-foreground">Cargando…</p>
        ) : error ? (
          <p className="mt-6 text-sm text-destructive">{error}</p>
        ) : (
          <div className="mt-6 space-y-8">
            {profile && (
              <section aria-label="Página principal">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Página principal
                </h2>
                <Card className="mt-2">
                  <CardContent className="flex items-center justify-between gap-4 py-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {profile.display_name || "Página principal"}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {profile.slug ? `/${profile.slug}` : profile.public_id}
                      </p>
                    </div>
                    <Badge>Principal</Badge>
                  </CardContent>
                </Card>
              </section>
            )}

            <section aria-label="Otras páginas">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Otras páginas
              </h2>

              {pages.length === 0 ? (
                <Card className="mt-2">
                  <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                    <p className="text-sm text-muted-foreground">
                      Todavía no has creado páginas adicionales
                    </p>
                    <Button asChild variant="outline">
                      <Link to="/pages/new">Crear página</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="mt-2 divide-y divide-border rounded-lg border border-border">
                  {pages.map((page) => (
                    <div
                      key={page.id}
                      className="flex items-center justify-between gap-4 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{page.title}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {PAGE_TYPE_LABELS[page.page_type] ?? page.page_type} · Actualizada{" "}
                          {formatDate(page.updated_at)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <Badge variant={page.published ? "default" : "secondary"}>
                          {page.published ? "Publicada" : "Borrador"}
                        </Badge>
                        <Button asChild variant="outline" size="sm">
                          <Link to="/pages/$pageId" params={{ pageId: page.id }}>
                            Abrir
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </AppShell>
  );
}
