import { createFileRoute, Link, Outlet, useMatches } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Check,
  Copy,
  Eye,
  Loader2,
  Rocket,
  SearchX,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../components/app-shell/AppShell";
import { CqEmptyState } from "../components/cq-ui/CqEmptyState";
import { CqPageHeader } from "../components/cq-ui/CqPageHeader";
import { CqPanel } from "../components/cq-ui/CqPanel";
import { CqStatusPill } from "../components/cq-ui/CqStatusPill";
import {
  cqDangerButton,
  cqPrimaryButton,
  cqSecondaryButton,
  cqSoftButton,
} from "../components/cq-ui/buttonStyles";
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

/**
 * F7 — `/pages/$pageId` visual closure.
 *
 * Presentation-only migration to the F1 tokens + the F6 `cq-ui` kit. Everything
 * that defines this route stays byte-identical in behaviour: the `useMatches`
 * nested-child `Outlet` short-circuit, the `{pageId}` prototype branch, the UUID
 * guard before `pageService.getOwnPageById`, ownership (the service resolves the
 * page by `owner_user_id`), the alias grammar (`isValidPageAlias` /
 * `normalizePageAlias` → `pageAliasService.savePageAlias`), publication
 * (`pageCanonicalService.publish` / `unpublish` with the real
 * `published_revision`), the canonical envelope read, `PageQrPanel` and every
 * canonical URL helper (`getPublicPageUrl` / `getPublicPageAliasUrl`).
 *
 * F4.5 — information architecture: sharing (`Compartir`, only when published)
 * and the depth hand-off to Analytics live here, because both belong to the
 * page asset. The CTA below is pure navigation: no new query, hook or metric.
 */

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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  const [message, setMessage] = useState<{
    kind: "invalid" | "collision" | "saved";
    text: string;
  } | null>(null);

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
    <CqPanel
      headingId="page-alias-heading"
      title="Enlace personalizado"
      description="El alias corto de esta página, guardado en tu fila real."
      visual="magic"
    >
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="page_alias">Enlace personalizado</Label>
          <div className="flex min-w-0 items-center gap-1">
            <span className="shrink-0 text-[13.5px] text-cq-subtle">cripqer.dev/pg/a/</span>
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
          <p className="break-all rounded-cq-md bg-cq-canvas px-4 py-3 font-mono text-[13px] font-medium leading-relaxed text-cq-ink ring-1 ring-cq-line">
            {aliasUrl}
          </p>
        )}

        {message && (
          <p
            className={
              message.kind === "saved"
                ? "text-[13px] font-medium text-emerald-700"
                : "text-[13px] font-medium text-red-600"
            }
          >
            {message.text}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={cqPrimaryButton} onClick={() => save(false)} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Guardar
          </button>
          {page.slug && (
            <button type="button" className={cqSecondaryButton} onClick={copy}>
              <Copy className="h-4 w-4 text-cq-muted" aria-hidden="true" /> Copiar
            </button>
          )}
          {page.slug && (
            <button
              type="button"
              className={cqDangerButton}
              onClick={() => save(true)}
              disabled={saving}
            >
              Quitar
            </button>
          )}
        </div>
      </div>
    </CqPanel>
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
  const [linkCopied, setLinkCopied] = useState(false);

  // /pages/$pageId is the parent of the nested child route /pages/$pageId/edit.
  // When the edit child is the active match we must render the outlet instead of
  // the PageDetail content, otherwise the editor child UI never mounts.
  const matches = useMatches();
  const hasNestedChild = matches.some(
    (match) => match.routeId !== "/pages/$pageId" && match.routeId.startsWith("/pages/$pageId/"),
  );

  useEffect(() => {
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) return;
        setUserId(auth.user.id);

        if (pageId === "{pageId}") {
          setPage({
            id: "{pageId}",
            title: "Prototipo",
            page_type: "catalog",
            public_id: "test",
          } as any);
          setLoading(false);
          return;
        }

        // Route params are user-controlled. Validate before querying the UUID
        // column so malformed links resolve to the normal not-found state.
        const loaded = UUID_PATTERN.test(pageId)
          ? await pageService.getOwnPageById(supabase, pageId, auth.user.id)
          : null;
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
        ? await pageCanonicalService.unpublish(supabase, page.id, userId, page.published_revision)
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

  /** F4.5 — sharing belongs to the page asset, so it lives here (not on Home). */
  const copyPublicLink = async () => {
    if (!page) return;
    try {
      await navigator.clipboard.writeText(getPublicPageUrl(page.public_id));
      setLinkCopied(true);
      toast.success("Enlace copiado");
      window.setTimeout(() => setLinkCopied(false), 1800);
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  if (hasNestedChild) {
    return <Outlet />;
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-cq-page px-4 pb-16 pt-8 sm:px-6 sm:pt-10 lg:px-10 lg:pt-14">
        <Link to="/pages" className={`${cqSoftButton} no-underline`}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a mis páginas
        </Link>

        {loading ? (
          <p className="mt-8 text-[13.5px] text-cq-muted">Cargando…</p>
        ) : notFound || !page ? (
          <div className="mt-8">
            <CqEmptyState
              headingId="page-detail-missing-heading"
              icon={<SearchX className="h-5 w-5" />}
              title="Página no disponible"
              description="No se encontró esta página o no tienes acceso a ella."
              action={
                <Link to="/pages" className={`${cqPrimaryButton} no-underline`}>
                  Ver mis páginas
                </Link>
              }
            />
          </div>
        ) : (
          <>
            <div className="mt-8">
              <CqPageHeader
                title={page.title}
                description={PAGE_TYPE_LABELS[page.page_type] ?? page.page_type}
                visual="magic"
                pill={
                  <CqStatusPill
                    tone={page.published ? "positive" : "neutral"}
                    label={page.published ? "Publicada" : "Borrador"}
                  />
                }
                actions={
                  <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex sm:flex-wrap sm:items-center">
                    <Link
                      to="/pages/$pageId/edit"
                      params={{ pageId: page.id }}
                      className={`${cqSecondaryButton} no-underline`}
                    >
                      Editar con Magic
                    </Link>
                    {page.published && (
                      <a
                        href={getPublicPageUrl(page.public_id)}
                        target="_blank"
                        rel="noreferrer"
                        className={`${cqSecondaryButton} no-underline`}
                      >
                        <Eye className="h-4 w-4 text-cq-muted" aria-hidden="true" /> Abrir página
                      </a>
                    )}
                    {page.published && (
                      <button
                        type="button"
                        className={cqSecondaryButton}
                        onClick={() => void copyPublicLink()}
                      >
                        {linkCopied ? (
                          <Check className="h-4 w-4 text-cq-blue" aria-hidden="true" />
                        ) : (
                          <Share2 className="h-4 w-4 text-cq-muted" aria-hidden="true" />
                        )}
                        Compartir
                      </button>
                    )}
                    <button
                      type="button"
                      className={cqPrimaryButton}
                      onClick={() => void togglePublication()}
                      disabled={publicationBusy}
                    >
                      {publicationBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Rocket className="h-4 w-4" aria-hidden="true" />
                      )}
                      {page.published ? "Despublicar" : "Publicar"}
                    </button>
                    <button
                      type="button"
                      className={cqSecondaryButton}
                      onClick={() => setShowQr((v) => !v)}
                      aria-expanded={showQr}
                    >
                      QR de esta página
                    </button>
                    <Link
                      to="/pages/$pageId/analytics"
                      params={{ pageId: page.id }}
                      className={`${cqSecondaryButton} no-underline`}
                    >
                      <BarChart3 className="h-4 w-4 text-cq-muted" aria-hidden="true" /> Ver
                      Analytics
                    </Link>
                  </div>
                }
              />
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)] lg:items-start lg:gap-8">
              <CqPanel headingId="page-details-heading" title="Detalles" visual="magic">
                <dl className="divide-y divide-cq-line text-[13.5px]">
                  <div className="flex items-center justify-between gap-4 py-3.5 first:pt-0">
                    <dt className="text-cq-muted">Título</dt>
                    <dd className="min-w-0 truncate font-semibold text-cq-ink">{page.title}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3.5">
                    <dt className="text-cq-muted">Objetivo</dt>
                    <dd className="font-semibold text-cq-ink">
                      {PAGE_TYPE_LABELS[page.page_type] ?? page.page_type}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3.5">
                    <dt className="text-cq-muted">ID público</dt>
                    <dd className="min-w-0 break-all font-mono text-[13px] font-semibold text-cq-ink">
                      {page.public_id}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3.5">
                    <dt className="text-cq-muted">Estado</dt>
                    <dd className="font-semibold text-cq-ink">
                      {page.published ? "Publicada" : "Borrador"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3.5">
                    <dt className="text-cq-muted">Creada</dt>
                    <dd className="font-semibold text-cq-ink">{formatDate(page.created_at)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3.5 last:pb-0">
                    <dt className="text-cq-muted">Actualizada</dt>
                    <dd className="font-semibold text-cq-ink">{formatDate(page.updated_at)}</dd>
                  </div>
                </dl>
              </CqPanel>

              <div className="min-w-0 space-y-6">
                {userId && (
                  <PageAliasSection
                    page={page}
                    userId={userId}
                    onAliasChange={(slug) => setPage((p) => (p ? { ...p, slug } : p))}
                  />
                )}

                {showQr && userId && (
                  <CqPanel
                    headingId="page-qr-heading"
                    title="QR de esta página"
                    visual="magic"
                  >
                    <PageQrPanel page={page} userId={userId} />
                  </CqPanel>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </AppShell>
  );
}
