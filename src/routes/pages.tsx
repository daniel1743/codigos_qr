import { createFileRoute, Link, Outlet, useMatches } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BarChart3, Eye, Loader2, Pencil, Plus, QrCode, Rocket, Trash2 } from "lucide-react";
import { AppShell } from "../components/app-shell/AppShell";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import { pageService } from "../services/page.service";
import { pageCanonicalService } from "../services/page-canonical.service";
import { profileService } from "../services/profile.service";
import { readCanonicalPageEnvelope } from "../lib/canonical-page";
import { getPublicPageUrl } from "../lib/url";
import { toast } from "sonner";
import type { Page, Profile } from "../types/database";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/ui/alert-dialog";

const PAGE_TYPE_LABELS: Record<string, string> = {
  landing: "Landing",
  promotion: "Promoción",
  menu: "Menú",
  campaign: "Campaña",
  event: "Evento",
  services: "Servicios",
  catalog: "Catálogo",
  portfolio: "Portafolio",
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

function PageActions({
  page,
  onChange,
  onDeleted,
}: {
  page: Page;
  onChange: (page: Page) => void;
  onDeleted: (pageId: string) => void;
}) {
  const supabase = getBrowserSupabaseClient();
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const togglePublication = async () => {
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Debes iniciar sesión para cambiar la publicación.");
      const userId = auth.user.id;
      if (page.published) {
        onChange(
          await pageCanonicalService.unpublish(
            supabase,
            page.id,
            userId,
            page.published_revision,
          ),
        );
        toast.success("Página despublicada");
        return;
      }

      const envelope = readCanonicalPageEnvelope(page.template_config);
      if (!envelope) {
        toast.error("Abre la página y guárdala antes de publicarla.");
        return;
      }
      onChange(
        await pageCanonicalService.publish(
          supabase,
          page.id,
          userId,
          envelope.editorConfig,
          page.published_revision,
        ),
      );
      toast.success("Página publicada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar la publicación.");
    } finally {
      setBusy(false);
    }
  };

  const deletePage = async () => {
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Debes iniciar sesión para eliminar una página.");
      await pageService.deleteOwnedChildPage(supabase, page.id, auth.user.id);
      onDeleted(page.id);
      setDeleteOpen(false);
      toast.success("Página eliminada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar la página.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button asChild variant="outline" size="sm">
        <Link to="/pages/$pageId/edit" params={{ pageId: page.id }}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
        </Link>
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link to="/pages/$pageId/analytics" params={{ pageId: page.id }}>
          <BarChart3 className="mr-1.5 h-3.5 w-3.5" /> Estadísticas
        </Link>
      </Button>
      {page.published && (
        <Button asChild variant="outline" size="sm">
          <a href={getPublicPageUrl(page.public_id)} target="_blank" rel="noreferrer">
            <Eye className="mr-1.5 h-3.5 w-3.5" /> Abrir
          </a>
        </Button>
      )}
      <Button asChild variant="outline" size="sm">
        <Link to="/pages/$pageId" params={{ pageId: page.id }}>
          <QrCode className="mr-1.5 h-3.5 w-3.5" /> QR
        </Link>
      </Button>
      <Button size="sm" onClick={() => void togglePublication()} disabled={busy}>
        {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Rocket className="mr-1.5 h-3.5 w-3.5" />}
        {page.published ? "Despublicar" : "Publicar"}
      </Button>
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!busy) setDeleteOpen(open);
        }}
      >
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" disabled={busy}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Eliminar
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar página</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará esta página. No podrás recuperarla.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                void deletePage();
              }}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PagesList() {
  const supabase = getBrowserSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [error, setError] = useState<string | null>(null);

  // /pages is the parent of the nested child routes (/pages/$pageId, /pages/new,
  // /pages/$pageId/edit). When one of those children is the active match we must
  // render the outlet instead of the list, otherwise the child UI never mounts.
  const matches = useMatches();
  const hasNestedChild = matches.some(
    (match) => match.routeId !== "/pages" && match.routeId.startsWith("/pages/"),
  );

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

  if (hasNestedChild) {
    return <Outlet />;
  }

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
                        {page.published && (
                          <a
                            href={getPublicPageUrl(page.public_id)}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 block truncate text-xs text-muted-foreground underline-offset-4 hover:underline"
                          >
                            {getPublicPageUrl(page.public_id)}
                          </a>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <Badge variant={page.published ? "default" : "secondary"}>
                          {page.published ? "Publicada" : "Borrador"}
                        </Badge>
                        <PageActions
                          page={page}
                          onChange={(updated) =>
                            setPages((current) =>
                              current.map((item) => (item.id === updated.id ? updated : item)),
                            )
                          }
                          onDeleted={(pageId) =>
                            setPages((current) => current.filter((item) => item.id !== pageId))
                          }
                        />
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
