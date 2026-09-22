import { createFileRoute, Link, Outlet, useMatches } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Copy, Eye, Loader2, Rocket } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../components/app-shell/AppShell";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import { pageService } from "../services/page.service";
import { pageAliasService } from "../services/page-alias.service";
import { isValidPageAlias, normalizePageAlias } from "../lib/page-alias";
import { getPublicPageAliasUrl } from "../lib/url";
import { getPublicPageUrl } from "../lib/url";
import { readCanonicalPageEnvelope } from "../lib/canonical-page";
import { pageCanonicalService } from "../services/page-canonical.service";
import { PageQrPanel } from "../components/qr/PageQrPanel";
import type { Page } from "../types/database";

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

function PageAliasSection({
  page,
  userId,
  onAliasChange,
}: {
  page: Page;
  userId: string;
  onAliasChange: (slug: string | null) => void;
}) {
  const [draft, setDraft] = useState(page.slug ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<
    { kind: "invalid" | "collision" | "saved"; text: string } | null
  >(null);

  const aliasUrl = page.slug ? getPublicPageAliasUrl(page.slug) : "";

  const save = async (remove = false) => {
    setSaving(true);
    setMessage(null);
    try {
      let next: string | null;
      if (remove || !draft.trim()) {
        next = null;
      } else {
        next = normalizePageAlias(draft);
        if (!isValidPageAlias(next)) {
          setMessage({ kind: "invalid", text: "Elige otro nombre para tu enlace" });
          return;
        }
      }
      await pageAliasService.savePageAlias(getBrowserSupabaseClient(), page.id, userId, next);
      setDraft(next ?? "");
      onAliasChange(next);
      setMessage({ kind: "saved", text: "Enlace guardado" });
    } catch (err) {
      const code = (err as { code?: string })?.code;
      setMessage({
        kind: code === "23505" ? "collision" : "invalid",
        text: code === "23505" ? "Ese enlace ya está en uso" : "No se pudo guardar el enlace",
      });
    } finally {
      setSaving(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(aliasUrl);
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Enlace personalizado</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="page_alias">Enlace personalizado</Label>
          <div className="flex items-center gap-1">
            <span className="shrink-0 text-sm text-muted-foreground">cripqer.dev/pg/a/</span>
            <Input
              id="page_alias"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setMessage(null);
              }}
              placeholder="promo-septiembre"
              maxLength={60}
              autoComplete="off"
            />
          </div>
        </div>

        {page.slug && (
          <p className="break-all font-mono text-xs text-muted-foreground">{aliasUrl}</p>
        )}

        {message && (
          <p
            className={
              message.kind === "saved" ? "text-sm text-emerald-600" : "text-sm text-destructive"
            }
          >
            {message.text}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => save(false)} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Guardar
          </Button>
          {page.slug && (
            <Button variant="outline" onClick={copy}>
              <Copy className="mr-2 h-4 w-4" /> Copiar
            </Button>
          )}
          {page.slug && (
            <Button variant="ghost" onClick={() => save(true)} disabled={saving}>
              Quitar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PageDetail() {
  const { pageId } = Route.useParams();
  const supabase = getBrowserSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<Page | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [publicationBusy, setPublicationBusy] = useState(false);

  // /pages/$pageId is the parent of the nested child route /pages/$pageId/edit.
  // When the edit child is the active match we must render the outlet instead of
  // the PageDetail content, otherwise the editor child UI never mounts.
  const matches = useMatches();
  const hasNestedChild = matches.some(
    (match) =>
      match.routeId !== "/pages/$pageId" && match.routeId.startsWith("/pages/$pageId/"),
  );

  useEffect(() => {
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) return;
        setUserId(auth.user.id);

        if (pageId === '{pageId}') {
          setPage({ id: '{pageId}', title: 'Prototipo', page_type: 'catalog', public_id: 'test' } as any);
          setLoading(false);
          return;
        }

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

  const togglePublication = async () => {
    if (!page || !userId) return;
    setPublicationBusy(true);
    try {
      const updated = page.published
        ? await pageCanonicalService.unpublish(
            supabase,
            page.id,
            userId,
            page.published_revision,
          )
        : (() => {
            const envelope = readCanonicalPageEnvelope(page.template_config);
            if (!envelope) throw new Error("Abre la página y guárdala antes de publicarla.");
            return pageCanonicalService.publish(
              supabase,
              page.id,
              userId,
              envelope.editorConfig,
              page.published_revision,
            );
          })();
      setPage(await updated);
      toast.success(page.published ? "Página despublicada" : "Página publicada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar la publicación.");
    } finally {
      setPublicationBusy(false);
    }
  };

  if (hasNestedChild) {
    return <Outlet />;
  }

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
            <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{page.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {PAGE_TYPE_LABELS[page.page_type] ?? page.page_type}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button asChild variant="outline">
                  <Link to="/pages/$pageId/edit" params={{ pageId: page.id }}>
                    Editar con Power
                  </Link>
                </Button>
                {page.published && (
                  <Button asChild variant="outline">
                    <a href={getPublicPageUrl(page.public_id)} target="_blank" rel="noreferrer">
                      <Eye className="mr-2 h-4 w-4" /> Abrir página
                    </a>
                  </Button>
                )}
                <Button onClick={() => void togglePublication()} disabled={publicationBusy}>
                  {publicationBusy ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Rocket className="mr-2 h-4 w-4" />
                  )}
                  {page.published ? "Despublicar" : "Publicar"}
                </Button>
                <Button variant="outline" onClick={() => setShowQr((v) => !v)}>
                  QR / Compartir
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

            {userId && (
              <PageAliasSection
                page={page}
                userId={userId}
                onAliasChange={(slug) => setPage((p) => (p ? { ...p, slug } : p))}
              />
            )}

            {showQr && userId && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>QR de esta página</CardTitle>
                </CardHeader>
                <CardContent>
                  <PageQrPanel page={page} userId={userId} />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </AppShell>
  );
}
